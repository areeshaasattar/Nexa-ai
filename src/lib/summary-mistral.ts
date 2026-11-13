import type { SummaryChatMessage } from "./summary-schema";
import {
  getProviderRetryDelayMs,
  isNonRetryableProviderStatus,
  isRetryableProviderFailure,
  SUMMARY_PROVIDER_MAX_ATTEMPTS,
  SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS,
} from "./summary-backoff";

type LlmProvider = "mistral" | "groq";

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

function getGroqModel(): string {
  const model = process.env.GROQ_MODEL?.trim();
  return model || DEFAULT_GROQ_MODEL;
}

function hasGroqFallback(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function isMistralLimitOrQuotaFailure(
  status: number | "network" | "timeout",
  message?: string,
  code?: string,
): boolean {
  if (status === 429) return true;
  if (status === 402) return true;
  if (status === 403) {
    const hay = `${message ?? ""} ${code ?? ""}`.toLowerCase();
    if (
      hay.includes("quota") ||
      hay.includes("limit") ||
      hay.includes("rate") ||
      hay.includes("insufficient") ||
      hay.includes("credit") ||
      hay.includes("billing")
    ) {
      return true;
    }
  }
  if (typeof status === "number") {
    const hay = `${message ?? ""} ${code ?? ""}`.toLowerCase();
    if (
      hay.includes("rate limit") ||
      hay.includes("ratelimit") ||
      hay.includes("quota") ||
      hay.includes("insufficient_quota")
    ) {
      return true;
    }
  }
  return false;
}

export class SummaryRateLimitError extends Error {
  constructor() {
    super("AI provider rate-limited; retry later.");
    this.name = "SummaryRateLimitError";
  }
}

export type SummaryProviderCallResult =
  | {
      ok: true;
      content: string;
      providerAttempts: number;
      status: number;
    }
  | {
      ok: false;
      reason: "provider_busy";
      providerAttempts: number;
      status: number | "network" | "timeout";
      retryableExhausted: boolean;
    }
  | {
      ok: false;
      reason: "provider_error";
      providerAttempts: number;
      status: number | "network" | "timeout";
      message: string;
    };

export interface ProviderAttemptBudget {
  used: number;
  max: number;
}

export function createProviderAttemptBudget(
  max = SUMMARY_PROVIDER_MAX_ATTEMPTS,
): ProviderAttemptBudget {
  return { used: 0, max };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractAssistantContent(payload: unknown): string {
  const choices = (payload as { choices?: unknown })?.choices;
  if (!Array.isArray(choices)) return "";

  const message = (choices[0] as { message?: { content?: unknown } })?.message;
  const content = message?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        const text = (chunk as { text?: unknown })?.text;
        return typeof text === "string" ? text : "";
      })
      .join("");
  }

  return "";
}

async function readProviderErrorMeta(response: Response): Promise<{ code?: string; message?: string; type?: string }> {
  try {
    const text = await response.clone().text();
    if (!text) return {};
    const json = JSON.parse(text);
    const err = (json as { error?: unknown })?.error ?? json;
    if (!err || typeof err !== "object") return {};
    const e = err as Record<string, unknown>;
    return {
      code: typeof e.code === "string" ? e.code : undefined,
      message: typeof e.message === "string" ? e.message : undefined,
      type: typeof e.type === "string" ? e.type : undefined,
    };
  } catch {
    return {};
  }
}

async function fetchProviderOnce(options: {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  messages: SummaryChatMessage[];
}): Promise<
  | { ok: true; status: number; content: string }
  | {
      ok: false;
      status: number | "network" | "timeout";
      retryAfter: string | null;
      message: string;
      code?: string;
      type?: string;
    }
> {
  const { provider, model, apiKey, messages } = options;
  const endpoint = provider === "groq" ? GROQ_ENDPOINT : MISTRAL_ENDPOINT;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = extractAssistantContent(data);
      if (!content.trim()) {
        return {
          ok: false,
          status: response.status,
          retryAfter: null,
          message: `${provider} returned an empty response.`,
        };
      }
      return { ok: true, status: response.status, content };
    }

    const meta = await readProviderErrorMeta(response);
    const fallbackMsg = `${provider} request failed with status ${response.status}.`;
    return {
      ok: false,
      status: response.status,
      retryAfter: response.headers.get("Retry-After"),
      message: meta.message || fallbackMsg,
      code: meta.code,
      type: meta.type,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    const timeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        /timeout/i.test(error.message));
    return {
      ok: false,
      status: timeout ? "timeout" : "network",
      retryAfter: null,
      message,
    };
  }
}

export async function callMistralForSummary(options: {
  meetingId: string;
  model: string;
  apiKey: string;
  messages: SummaryChatMessage[];
  budget?: ProviderAttemptBudget;
  random?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
  nowMs?: () => number;
}): Promise<SummaryProviderCallResult> {
  const {
    meetingId,
    model,
    apiKey,
    messages,
    budget = createProviderAttemptBudget(),
    random = Math.random,
    sleepFn = sleep,
    nowMs = () => Date.now(),
  } = options;

  let activeProvider: LlmProvider = "mistral";
  let activeModel = model;
  let activeApiKey = apiKey;
  let fallbackUsed = false;

  let lastRetryableStatus: number | "network" | "timeout" | null = null;
  let attemptsThisCall = 0;

  while (budget.used < budget.max) {
    budget.used += 1;
    attemptsThisCall += 1;
    const providerAttempt = budget.used;
    const t0 = nowMs();

    const result = await fetchProviderOnce({
      provider: activeProvider,
      model: activeModel,
      apiKey: activeApiKey,
      messages,
    });
    const ms = Math.max(0, nowMs() - t0);

    if (result.ok) {
      console.log(
        JSON.stringify({
          event: "summary.llm_request",
          meetingId,
          provider: activeProvider,
          status: result.status,
          ms,
          providerAttempt,
          messageCount: messages.length,
          promptChars: messages.reduce((n, m) => n + m.content.length, 0),
        }),
      );
      return {
        ok: true,
        content: result.content,
        providerAttempts: attemptsThisCall,
        status: result.status,
      };
    }

    const status = result.status;
    const retryable = isRetryableProviderFailure(status);
    const nonRetryable = isNonRetryableProviderStatus(status);

    console.log(
      JSON.stringify({
        event: "summary.llm_request",
        meetingId,
        provider: activeProvider,
        status,
        ms,
        providerAttempt,
        messageCount: messages.length,
        promptChars: messages.reduce((n, m) => n + m.content.length, 0),
        retryable,
      }),
    );

    // Mistral -> Groq fallback on limit/quota reached (rate limit, quota, credits).
    // Fallback immediately (uses remaining shared budget) so "limit reached" switches providers smoothly.
    if (
      activeProvider === "mistral" &&
      !fallbackUsed &&
      hasGroqFallback() &&
      isMistralLimitOrQuotaFailure(status, result.message, result.code)
    ) {
      fallbackUsed = true;
      activeProvider = "groq";
      activeModel = getGroqModel();
      activeApiKey = process.env.GROQ_API_KEY!.trim();
      lastRetryableStatus = null;
      console.warn(
        JSON.stringify({
          event: "summary.provider_fallback",
          meetingId,
          from: "mistral",
          to: "groq",
          status,
          reason: "limit_or_quota",
          attempt: providerAttempt,
        }),
      );
      if (budget.used >= budget.max) {
        // No shared budget left to try fallback provider; surface as busy.
        console.warn(
          JSON.stringify({
            event: "summary.provider_busy_final",
            meetingId,
            provider: "mistral",
            status,
            attempts: budget.used,
          }),
        );
        return {
          ok: false,
          reason: "provider_busy",
          providerAttempts: attemptsThisCall,
          status,
          retryableExhausted: true,
        };
      }
      // Try Groq immediately (counts as next provider attempt in shared budget).
      continue;
    }

    if (retryable) {
      lastRetryableStatus = status;
      const remaining = budget.max - budget.used;
      if (remaining <= 0) {
        // If Mistral exhausted retries on a limit/quota and Groq is available but not yet tried,
        // we would have switched above. Reaching here means no fallback path left.
        console.warn(
          JSON.stringify({
            event: "summary.provider_busy_final",
            meetingId,
            provider: activeProvider,
            status,
            attempts: budget.used,
          }),
        );
        return {
          ok: false,
          reason: "provider_busy",
          providerAttempts: attemptsThisCall,
          status,
          retryableExhausted: true,
        };
      }

      const delayMs = getProviderRetryDelayMs({
        retryIndex: attemptsThisCall,
        retryAfterHeader: result.retryAfter,
        nowMs: nowMs(),
        randomValue: random(),
      });
      const boundedDelayMs = Math.min(delayMs, SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS);
      console.warn(
        JSON.stringify({
          event: "summary.provider_retry",
          meetingId,
          provider: activeProvider,
          attempt: providerAttempt,
          status,
          delayMs: boundedDelayMs,
        }),
      );
      await sleepFn(boundedDelayMs);
      continue;
    }

    if (nonRetryable) {
      return {
        ok: false,
        reason: "provider_error",
        providerAttempts: attemptsThisCall,
        status,
        message: result.message,
      };
    }

    return {
      ok: false,
      reason: "provider_error",
      providerAttempts: attemptsThisCall,
      status,
      message: result.message,
    };
  }

  const status = lastRetryableStatus ?? "network";
  console.warn(
    JSON.stringify({
      event: "summary.provider_busy_final",
      meetingId,
      provider: activeProvider,
      status,
      attempts: budget.used,
    }),
  );
  return {
    ok: false,
    reason: "provider_busy",
    providerAttempts: attemptsThisCall,
    status,
    retryableExhausted: true,
  };
}

/**
 * Legacy/compat caller for scripts: performs provider retries/backoff and
 * returns content on success. Throws on provider_busy or non-retryable errors.
 */
export function createMistralSummaryCaller(options: {
  meetingId: string;
  model: string;
  apiKey: string;
}) {
  const { meetingId, model, apiKey } = options;
  return async (messages: SummaryChatMessage[]): Promise<string> => {
    const result = await callMistralForSummary({
      meetingId,
      model,
      apiKey,
      messages,
    });
    if (result.ok) return result.content;
    if (result.reason === "provider_busy") {
      throw new SummaryRateLimitError();
    }
    throw new Error(result.message);
  };
}

