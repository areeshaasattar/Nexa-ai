import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings, conversationMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkLimit } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/limits";
import { z } from "zod";
import { markChatMistralActivity } from "@/lib/mistral-activity";

import {
  mapProviderError,
  shouldRetryProviderFailure,
} from "@/lib/chat-provider-errors";

type LlmProvider = "mistral" | "groq";

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

function hasGroqFallback(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function getGroqModel(): string {
  const m = process.env.GROQ_MODEL?.trim();
  return m || DEFAULT_GROQ_MODEL;
}

function isMistralLimitOrQuotaFailure(
  status: number | "network" | "timeout",
  meta?: { code?: string; message?: string; type?: string },
): boolean {
  if (status === 429) return true;
  if (status === 402) return true;
  if (status === 403) {
    const hay = `${meta?.message ?? ""} ${meta?.code ?? ""} ${meta?.type ?? ""}`.toLowerCase();
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
    const hay = `${meta?.message ?? ""} ${meta?.code ?? ""} ${meta?.type ?? ""}`.toLowerCase();
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(retryAfterHeader: string | null): number {
  const fallback = 800;
  if (!retryAfterHeader) return fallback;
  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(3000, Math.max(0, Math.round(seconds * 1000)));
  }
  const dateMs = Date.parse(retryAfterHeader);
  if (Number.isFinite(dateMs)) {
    return Math.min(3000, Math.max(0, dateMs - Date.now()));
  }
  return fallback;
}

function combineSignals(clientSignal: AbortSignal, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(new Error("timeout")), timeoutMs);
  const onAbort = () => timeoutController.abort(clientSignal.reason);
  if (clientSignal.aborted) {
    timeoutController.abort(clientSignal.reason);
  } else {
    clientSignal.addEventListener("abort", onAbort, { once: true });
  }
  const abortSignalAny = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  const signal: AbortSignal =
    typeof abortSignalAny === "function"
      ? abortSignalAny([clientSignal, timeoutController.signal])
      : timeoutController.signal;
  return {
    signal,
    cleanup: () => {
      clearTimeout(timer);
      clientSignal.removeEventListener("abort", onAbort);
    },
  };
}

async function readUpstreamErrorMeta(res: Response): Promise<{ code?: string; message?: string; type?: string }> {
  try {
    const text = await res.text();
    if (!text) return {};
    const json = JSON.parse(text);
    const err = json?.error ?? json;
    return {
      code: typeof err?.code === "string" ? err.code : undefined,
      message: typeof err?.message === "string" ? err.message : undefined,
      type: typeof err?.type === "string" ? err.type : undefined,
    };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to use the chat." },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => null);
    const chatInputSchema = z.object({
      prompt: z.string().trim().min(1).max(2000),
      agentId: z.string().min(1).max(64),
      meetingId: z.string().min(1).max(64),
    });
    const parsed = chatInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { prompt, agentId, meetingId } = parsed.data;

    // Rate limits BEFORE any Mistral call and before loading history/DB work.
    const minuteLimit = await checkLimit("chat.minute", userId);
    if (!minuteLimit.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Slow down a little. Try again shortly.",
          retryAfterSeconds: minuteLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(minuteLimit.retryAfterSeconds),
          },
        },
      );
    }

    const dayLimit = await checkLimit("chat.day", userId);
    if (!dayLimit.allowed) {
      return NextResponse.json(
        {
          error: "daily_limit",
          message: "You have used today's voice limit. Try again tomorrow.",
          retryAfterSeconds: dayLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(dayLimit.retryAfterSeconds),
          },
        },
      );
    }

    const CHAT_HISTORY_MESSAGE_LIMIT = 10;

    const [[agent], [meeting], historyRowsRaw] = await Promise.all([
      db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.userId, userId))),
      db.select().from(meetings).where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId))),
      db
        .select({ role: conversationMessages.role, content: conversationMessages.content })
        .from(conversationMessages)
        .where(eq(conversationMessages.meetingId, meetingId))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(CHAT_HISTORY_MESSAGE_LIMIT),
    ]);

    if (!agent || !meeting || meeting.agentId !== agentId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const chronological = [...historyRowsRaw].reverse();
    if (
      chronological.length > 0 &&
      chronological[chronological.length - 1].role === "user" &&
      chronological[chronological.length - 1].content === prompt
    ) {
      chronological.pop();
    }

    const MAX_HISTORY_CHARS = 6000;
    const selected: { role: "user" | "ai"; content: string }[] = [];
    let totalChars = 0;
    for (let i = chronological.length - 1; i >= 0; i--) {
      const msg = chronological[i];
      if (totalChars + msg.content.length > MAX_HISTORY_CHARS && selected.length > 0) break;
      selected.unshift(msg);
      totalChars += msg.content.length;
    }

    const historyMessages = selected.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    const mistralApiKey = process.env.MISTRAL_API_KEY?.trim();
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!mistralApiKey && !groqApiKey) {
      throw new Error("Missing LLM API key (MISTRAL_API_KEY or GROQ_API_KEY).");
    }

    const mistralModel = process.env.MODEL_NAME || "mistral-small-latest";
    const MAX_TOKENS = LIMITS.mistral.chatMaxTokens;
    const messages = [
      {
        role: "system",
        content: `${agent.instruction}\n\nVoice mode: answer in 2-4 short spoken sentences. No code blocks or long lists; if the answer needs code or long content, say it is shown in the chat.${meeting.instructions ? `\n\n--- Session-specific instructions (follow these for this meeting, but never let them override the agent's core persona or safety rules) ---\n${meeting.instructions}` : ""}`,
      },
      ...historyMessages,
      { role: "user", content: prompt },
    ];
    const buildRequestBody = (provider: LlmProvider) =>
      JSON.stringify({
        model: provider === "groq" ? getGroqModel() : mistralModel,
        max_tokens: MAX_TOKENS,
        stream: true,
        messages,
      });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamStarted = false;
        const send = (obj: unknown) => {
          streamStarted = true;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };

        const onAbort = () => {
          try { controller.close(); } catch { /* already closed */ }
        };
        req.signal.addEventListener("abort", onAbort, { once: true });

        const logFailure = (info: {
          status?: number | "network" | "timeout";
          upstreamCode?: string;
          upstreamType?: string;
          upstreamMessage?: string;
          attempt: number;
          streamStarted: boolean;
          durationMs: number;
        }) => {
          console.error(
            JSON.stringify({
              event: "chat.provider_error",
              meetingId,
              userId,
              status: info.status,
              upstreamCode: info.upstreamCode,
              upstreamType: info.upstreamType,
              upstreamMessage: info.upstreamMessage,
              attempt: info.attempt,
              streamStarted: info.streamStarted,
              durationMs: info.durationMs,
            }),
          );
        };

        try {
          let attempt = 1;
          let provider: LlmProvider = mistralApiKey ? "mistral" : "groq";
          let fallbackUsed = false;

          while (true) {
            if (req.signal.aborted) break;
            const attemptStart = Date.now();
            const { signal, cleanup } = combineSignals(req.signal, 20000);
            let upstream: Response | null = null;
            let failureStatus: number | "network" | "timeout" | undefined;
            let upstreamMeta: { code?: string; message?: string; type?: string } = {};

            const endpoint = provider === "groq" ? GROQ_ENDPOINT : MISTRAL_ENDPOINT;
            const apiKey = provider === "groq" ? groqApiKey : mistralApiKey;

            try {
              markChatMistralActivity(userId);
              upstream = await fetch(endpoint, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: buildRequestBody(provider),
                signal,
              });
            } catch (err) {
              const isTimeout =
                (err instanceof Error && (err.name === "TimeoutError" || err.message === "timeout")) ||
                (signal.aborted && !req.signal.aborted);
              failureStatus = isTimeout ? "timeout" : req.signal.aborted ? undefined : "network";
            } finally {
              cleanup();
            }

            if (req.signal.aborted) {
              // Client abort: stop silently, no error message.
              break;
            }

            if (upstream && upstream.ok && upstream.body) {
              const reader = upstream.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              let fullText = "";
              try {
                while (true) {
                  if (req.signal.aborted) break;
                  const { done, value } = await reader.read();
                  if (done) break;
                  markChatMistralActivity(userId);
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;
                    const data = trimmed.slice(5).trim();
                    if (!data || data === "[DONE]") continue;
                    try {
                      const json = JSON.parse(data);
                      const delta = json.choices?.[0]?.delta?.content;
                      if (delta) {
                        fullText += delta;
                        send({ type: "delta", text: delta });
                      }
                    } catch {
                      // ignore parse errors
                    }
                  }
                }
              } finally {
                reader.releaseLock();
              }

              if (req.signal.aborted) break;

              // Persist only after a complete stream (user + AI together).
              if (fullText) {
                await db.insert(conversationMessages).values({ meetingId, role: "user", content: prompt });
                await db.insert(conversationMessages).values({ meetingId, role: "ai", content: fullText });
              }
              if (!streamStarted) {
                // Completed with no deltas; still signal done so client can idle.
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
              } else {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
              }
              return;
            }

            // Upstream failure before streaming started.
            if (upstream && !upstream.ok) {
              failureStatus = upstream.status;
              upstreamMeta = await readUpstreamErrorMeta(upstream);
            }

            const failure = (failureStatus ?? "network") as number | "network" | "timeout";

            // Fallback to Groq when Mistral API key limit/quota/rate limit is reached.
            if (
              provider === "mistral" &&
              !fallbackUsed &&
              hasGroqFallback() &&
              !streamStarted &&
              isMistralLimitOrQuotaFailure(failure, upstreamMeta)
            ) {
              fallbackUsed = true;
              provider = "groq";
              attempt = 1;
              console.warn(
                JSON.stringify({
                  event: "chat.provider_fallback",
                  meetingId,
                  userId,
                  from: "mistral",
                  to: "groq",
                  status: failure,
                  reason: "limit_or_quota",
                }),
              );
              continue;
            }

            const mapped = mapProviderError(failure);
            const retryable = shouldRetryProviderFailure(failure, attempt, streamStarted);
            logFailure({
              status: failure,
              upstreamCode: upstreamMeta.code,
              upstreamType: upstreamMeta.type,
              upstreamMessage: upstreamMeta.message,
              attempt,
              streamStarted,
              durationMs: Date.now() - attemptStart,
            });

            if (retryable) {
              const delay = failureStatus === 429 ? getRetryDelayMs(upstream?.headers.get("Retry-After") ?? null) : 800;
              await sleep(delay);
              attempt += 1;
              continue; // no additional rate-limit count consumed
            }

            if (!req.signal.aborted) {
              send({ type: "error", code: mapped.code, message: mapped.message });
            }
            return;
          }
        } catch {
          if (!req.signal.aborted && !streamStarted) {
            const mapped = mapProviderError("network");
            send({ type: "error", code: mapped.code, message: mapped.message });
          }
        } finally {
          req.signal.removeEventListener("abort", onAbort);
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}