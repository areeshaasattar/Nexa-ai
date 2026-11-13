import {
  buildSummaryMessages,
  createFallbackSummary,
  createInsufficientSummary,
  isSummarySourceTooShort,
  parseSummaryResponse,
  type StoredMeetingSummary,
  type SummaryChatMessage,
} from "./summary-schema";
import {
  callMistralForSummary,
  createProviderAttemptBudget,
  type ProviderAttemptBudget,
  type SummaryProviderCallResult,
} from "./summary-mistral";
import { SUMMARY_PROVIDER_MAX_ATTEMPTS } from "./summary-backoff";

export interface StructuredSummaryResult {
  status: "ok" | "provider_busy";
  data?: StoredMeetingSummary;
  /** Validation/model-call attempts made (legacy meaning). */
  attempts: number;
  /** Total provider HTTP attempts consumed (shared budget). */
  providerAttempts: number;
  validationAttempts: number;
  usedFallback: boolean;
  validationErrors: string[];
  providerError?: string;
}

export type LegacySummaryModelCaller = (
  messages: SummaryChatMessage[],
) => Promise<string>;

export interface GenerateSummaryOptions {
  source: string;
  meetingId?: string;
  model?: string;
  apiKey?: string;
  maxValidationAttempts?: number; // default 2 (existing behavior)
  maxAttempts?: number; // legacy alias for maxValidationAttempts
  budget?: ProviderAttemptBudget;
  random?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
  nowMs?: () => number;
  // Legacy test/compat path: bypasses provider backoff and consumes 1 budget unit per call.
  callModel?: LegacySummaryModelCaller;
}

async function callWithBudget(options: {
  meetingId: string;
  model: string;
  apiKey: string;
  messages: SummaryChatMessage[];
  budget: ProviderAttemptBudget;
  random?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
  nowMs?: () => number;
  callModel?: LegacySummaryModelCaller;
}): Promise<SummaryProviderCallResult> {
  const { callModel, budget } = options;
  if (callModel) {
    if (budget.used >= budget.max) {
      return {
        ok: false,
        reason: "provider_busy",
        providerAttempts: 0,
        status: "network",
        retryableExhausted: true,
      };
    }
    budget.used += 1;
    const content = await callModel(options.messages);
    return { ok: true, content, providerAttempts: 1, status: 200 };
  }

  return callMistralForSummary({
    meetingId: options.meetingId,
    model: options.model,
    apiKey: options.apiKey,
    messages: options.messages,
    budget,
    random: options.random,
    sleepFn: options.sleepFn,
    nowMs: options.nowMs,
  });
}

/**
 * Orchestration around the model call:
 *   1. skip the model entirely when the source is too short
 *   2. ask for JSON, parse + zod-validate
 *   3. on invalid output, retry once with the validation error described
 *      (separate from provider retries) but sharing the same provider attempt budget
 *   4. if schema is still invalid after validation retries, return a validated fallback
 *   5. if provider retries exhaust on transient 429/5xx/network, return provider_busy
 *      (no throw) so callers can store a transient pending state
 *
 * Max total provider attempts per generation: SUMMARY_PROVIDER_MAX_ATTEMPTS (4).
 */
export async function generateStructuredSummaryFromSource(
  options: GenerateSummaryOptions,
): Promise<StructuredSummaryResult> {
  const {
    source,
    meetingId = "unknown-meeting",
    model = "mistral-small-latest",
    apiKey = "",
    maxValidationAttempts = options.maxAttempts ?? 2,
    budget = createProviderAttemptBudget(SUMMARY_PROVIDER_MAX_ATTEMPTS),
    random,
    sleepFn,
    nowMs,
    callModel,
  } = options;

  if (isSummarySourceTooShort(source)) {
    return {
      status: "ok",
      data: createInsufficientSummary(),
      attempts: 0,
      providerAttempts: 0,
      validationAttempts: 0,
      usedFallback: false,
      validationErrors: [],
    };
  }

  const validationErrors: string[] = [];
  let previousResponse: string | undefined;

  for (let attempt = 1; attempt <= Math.max(1, maxValidationAttempts); attempt += 1) {
    const messages = buildSummaryMessages(source, {
      previousResponse,
      validationError: validationErrors[validationErrors.length - 1],
    });

    const result = await callWithBudget({
      meetingId,
      model,
      apiKey,
      messages,
      budget,
      random,
      sleepFn,
      nowMs,
      callModel,
    });

    if (!result.ok) {
      if (result.reason === "provider_busy") {
        return {
          status: "provider_busy",
          attempts: attempt,
          providerAttempts: budget.used,
          validationAttempts: attempt,
          usedFallback: false,
          validationErrors,
        };
      }
      throw new Error(result.message);
    }

    const parsed = parseSummaryResponse(result.content, source);
    if (parsed.success) {
      return {
        status: "ok",
        data: {
          ...parsed.data,
          meta: { kind: "structured" },
        },
        attempts: attempt,
        providerAttempts: budget.used,
        validationAttempts: attempt,
        usedFallback: false,
        validationErrors,
      };
    }

    validationErrors.push(parsed.error);
    previousResponse = result.content;
    if (budget.used >= budget.max) {
      break;
    }
  }

  const finalValidationAttempts = validationErrors.length || 1;
  return {
    status: "ok",
    data: createFallbackSummary(
      validationErrors[validationErrors.length - 1] ??
        "The model did not return valid JSON.",
    ),
    attempts: finalValidationAttempts,
    providerAttempts: budget.used,
    validationAttempts: finalValidationAttempts,
    usedFallback: true,
    validationErrors,
  };
}


