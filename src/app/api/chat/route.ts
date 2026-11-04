import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents, meetings, conversationMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkChatRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    // Resolve the authenticated user. The route is called from the browser
    // (the voice assistant) with the session cookie, so grab the user id from
    // the session — it both gates access and keys the per-user rate limit.
    // (The route previously had no auth check at all, so any anonymous caller
    // could burn the Mistral API key; this closes that hole while reusing the
    // exact session mechanism used elsewhere in the app.)
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

    // Per-user rate limit, enforced before any Mistral work so a single user
    // can't hammer the API and run up the bill. 429 carries Retry-After (secs)
    // and X-RateLimit-Remaining so the client can react intelligently.
    const rateLimit = await checkChatRateLimit(userId);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a moment before sending another message.",
          rateLimit: {
            limit: rateLimit.limit,
            remaining: rateLimit.remaining,
            reset: rateLimit.reset,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000)),
            ),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      );
    }

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

    // Fetch agent instructions
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

    // Verify the meeting belongs to the caller and is assigned to this agent.
    // Same 404 for missing / foreign / mismatched to avoid an existence oracle.
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.userId, userId)));

    if (!agent || !meeting || meeting.agentId !== agentId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Load recent conversation history for multi-turn memory.
    // Default 10 messages, configurable via this constant.
    const CHAT_HISTORY_MESSAGE_LIMIT = 10;
    const historyRows = await db
      .select({
        role: conversationMessages.role,
        content: conversationMessages.content,
      })
      .from(conversationMessages)
      .where(eq(conversationMessages.meetingId, meetingId))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(CHAT_HISTORY_MESSAGE_LIMIT);

    // Reverse to chronological order.
    const chronological = [...historyRows].reverse();

    // Guard against duplicating the current prompt if a client already
    // persisted it before calling this route: drop a trailing user message
    // whose content matches the incoming prompt.
    if (
      chronological.length > 0 &&
      chronological[chronological.length - 1].role === "user" &&
      chronological[chronological.length - 1].content === prompt
    ) {
      chronological.pop();
    }

    // Apply a total character budget (~6000), dropping the oldest first.
    const MAX_HISTORY_CHARS = 6000;
    const selected: { role: "user" | "ai"; content: string }[] = [];
    let totalChars = 0;
    for (let i = chronological.length - 1; i >= 0; i--) {
      const msg = chronological[i];
      if (totalChars + msg.content.length > MAX_HISTORY_CHARS && selected.length > 0) {
        break;
      }
      selected.unshift(msg);
      totalChars += msg.content.length;
    }

    const historyMessages = selected.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    if (!process.env.MISTRAL_API_KEY) {
      throw new Error("Missing MISTRAL_API_KEY in environment variables.");
    }

    const model = process.env.MODEL_NAME || "mistral-small-latest";

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: meeting.instructions
              ? `${agent.instruction}\n\n--- Session-specific instructions (follow these for this meeting, but never let them override the agent's core persona or safety rules) ---\n${meeting.instructions}`
              : agent.instruction,
          },
          ...historyMessages,
          { role: "user", content: prompt },
        ],
      }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      console.warn("Mistral rate limit reached while handling a chat request.");

      return NextResponse.json(
        {
          error:
            "The AI provider is temporarily rate-limiting requests. Please wait and try again. If this continues, check your Mistral usage and rate limits.",
          code: "AI_PROVIDER_RATE_LIMITED",
        },
        {
          status: 503,
          headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
        },
      );
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "No response from AI.";

    // Persist conversation (user first, then ai) only after a successful LLM response.
    await db.insert(conversationMessages).values({
      meetingId,
      role: "user",
      content: prompt,
    });
    await db.insert(conversationMessages).values({
      meetingId,
      role: "ai",
      content: responseText,
    });

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Chat API Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}