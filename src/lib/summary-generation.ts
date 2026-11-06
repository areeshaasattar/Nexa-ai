import {
  buildSummaryMessages,
  createFallbackSummary,
  createInsufficientSummary,
  isSummarySourceTooShort,
  parseSummaryResponse,
  type StoredMeetingSummary,
  type SummaryChatMessage,
} from "./summary-schema";

export type SummaryModelCaller = (
  messages: SummaryChatMessage[],
) => Promise<string>;

export interface StructuredSummaryResult {
  data: StoredMeetingSummary;
  attempts: number;
  usedFallback: boolean;
  validationErrors: string[];
}

/**
 * Pure orchestration around the model call:
 *   1. skip the model entirely when the source is too short
 *   2. ask for JSON, parse + zod-validate
 *   3. on invalid output, retry once with the validation error described
 *   4. if it is still invalid, return a validated overview-only fallback
 *
 * Nothing returned here is unvalidated. The caller only has to persist
 * `result.data`.
 */
export async function generateStructuredSummaryFromSource(options: {
  source: string;
  callModel: SummaryModelCaller;
  maxAttempts?: number;
}): Promise<StructuredSummaryResult> {
  const { source, callModel } = options;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);

  if (isSummarySourceTooShort(source)) {
    return {
      data: createInsufficientSummary(),
      attempts: 0,
      usedFallback: false,
      validationErrors: [],
    };
  }

  const validationErrors: string[] = [];
  let previousResponse: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const messages = buildSummaryMessages(source, {
      previousResponse,
      validationError: validationErrors[validationErrors.length - 1],
    });

    const raw = await callModel(messages);
    const parsed = parseSummaryResponse(raw, source);

    if (parsed.success) {
      return {
        data: {
          ...parsed.data,
          meta: { kind: "structured" },
        },
        attempts: attempt,
        usedFallback: false,
        validationErrors,
      };
    }

    validationErrors.push(parsed.error);
    previousResponse = raw;
  }

  return {
    data: createFallbackSummary(
      validationErrors[validationErrors.length - 1] ??
        "The model did not return valid JSON.",
    ),
    attempts: maxAttempts,
    usedFallback: true,
    validationErrors,
  };
}
