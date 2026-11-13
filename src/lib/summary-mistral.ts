import type { SummaryChatMessage } from "./summary-schema";
import { callLLM } from "./llm";

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
 * Legacy/compat caller for scripts: performs a single LLM call (with provider
 * fallback handled inside callLLM) and returns content on success.
 * Throws SummaryRateLimitError on 429, Error otherwise.
 */
export function createMistralSummaryCaller(options: {
  meetingId: string;
  model: string;
  apiKey: string;
}) {
  const { meetingId } = options;
  return async (messages: SummaryChatMessage[]): Promise<string> => {
    const { response } = await callLLM({
      messages,
      stream: false,
      jsonMode: true,
      maxTokens: 1500,
      temperature: 0,
      purpose: "summary",
    });
    if (!response.ok) {
      if (response.status === 429) throw new SummaryRateLimitError();
      throw new Error(`LLM request failed with status ${response.status}.`);
    }
    const data = await response.json();
    const content = extractAssistantContent(data);
    if (!content.trim()) {
      throw new Error("LLM returned an empty response.");
    }
    console.log(
      JSON.stringify({
        event: "summary.llm_request",
        meetingId,
        status: response.status,
        messageCount: messages.length,
        promptChars: messages.reduce((n, m) => n + m.content.length, 0),
      }),
    );
    return content;
  };
}