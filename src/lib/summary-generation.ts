import {
  buildSummaryMessages,
  createFallbackSummary,
  createInsufficientSummary,
  isSummarySourceTooShort,
  parseSummaryResponse,
  type StoredMeetingSummary,
  type SummaryChatMessage,
} from "./summary-schema";
import { callLLM } from "./llm";

export interface StructuredSummaryResult {
  status: "ok" | "provider_busy";
  data?: StoredMeetingSummary;
  attempts: number;
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
  maxValidationAttempts?: number;
  maxAttempts?: number;
  budget?: { used: number; max: number };
  random?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
  nowMs?: () => number;
  callModel?: LegacySummaryModelCaller;
  temperature?: number;
  jsonMode?: boolean;
}

export async function generateStructuredSummaryFromSource(
  options: GenerateSummaryOptions,
): Promise<StructuredSummaryResult> {
  const {
    source,
    maxValidationAttempts = options.maxAttempts ?? 2,
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

    let content: string;
    if (callModel) {
      content = await callModel(messages);
    } else {
      const { response } = await callLLM({
        messages,
        stream: false,
        jsonMode: true,
        maxTokens: 1500,
        temperature: 0,
        purpose: "summary",
      });
      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return {
            status: "provider_busy",
            attempts: attempt,
            providerAttempts: attempt,
            validationAttempts: attempt,
            usedFallback: false,
            validationErrors,
          };
        }
        throw new Error(`LLM request failed with status ${status}.`);
      }
      const data = await response.json();
      const extracted = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
      content = typeof extracted === "string" ? extracted : "";
      if (!content.trim()) {
        throw new Error("LLM returned an empty response.");
      }
    }

    const parsed = parseSummaryResponse(content, source);
    if (parsed.success) {
      return {
        status: "ok",
        data: {
          ...parsed.data,
          meta: { kind: "structured" },
        },
        attempts: attempt,
        providerAttempts: attempt,
        validationAttempts: attempt,
        usedFallback: false,
        validationErrors,
      };
    }

    validationErrors.push(parsed.error);
    previousResponse = content;
  }

  return {
    status: "ok",
    data: createFallbackSummary(
      validationErrors[validationErrors.length - 1] ??
        "The model did not return valid JSON.",
    ),
    attempts: validationErrors.length || 1,
    providerAttempts: validationErrors.length || 1,
    validationAttempts: validationErrors.length || 1,
    usedFallback: true,
    validationErrors,
  };
}