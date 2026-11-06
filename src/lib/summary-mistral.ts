import type { SummaryChatMessage } from "./summary-schema";
import type { SummaryModelCaller } from "./summary-generation";

export class SummaryRateLimitError extends Error {
  constructor() {
    super("AI provider rate-limited; retry later.");
    this.name = "SummaryRateLimitError";
  }
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

/**
 * Mistral chat-completions caller in JSON mode.
 *
 * JSON mode is enabled with `response_format: { type: "json_object" }` (Mistral
 * documents this under Structured Outputs → JSON Mode). It guarantees valid
 * JSON but not our schema, so callers must still zod-validate the content.
 */
export function createMistralSummaryCaller(options: {
  meetingId: string;
  model: string;
  apiKey: string;
}): SummaryModelCaller {
  const { meetingId, model, apiKey } = options;

  return async (messages: SummaryChatMessage[]) => {
    const t0 = Date.now();
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
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

    // Log ids, lengths and timings only. Never prompt/response content.
    console.log(
      JSON.stringify({
        event: "summary.llm_request",
        meetingId,
        status: response.status,
        ms: Date.now() - t0,
        messageCount: messages.length,
        promptChars: messages.reduce((n, m) => n + m.content.length, 0),
      }),
    );

    if (response.status === 429) {
      throw new SummaryRateLimitError();
    }

    if (!response.ok) {
      throw new Error(`Mistral request failed with status ${response.status}.`);
    }

    const data = await response.json();
    const content = extractAssistantContent(data);
    if (!content.trim()) {
      throw new Error("Mistral returned an empty response.");
    }
    return content;
  };
}
