import { db } from "@/db";
import { meetings, conversationMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Fetch conversation messages for a meeting and call the Mistral API to
 * generate a concise 3-5 sentence summary, then persist it on the meeting record.
 *
 * Idempotent: if `meetings.summary` is already set for the given meeting, the
 * function returns early without re-generating. This makes it safe to call
 * from both the client-side `endCall` mutation AND the Stream webhook
 * `call.session_ended` handler — whichever fires first writes the summary,
 * the second call is a no-op.
 */
export async function generateMeetingSummary(meetingId: string): Promise<void> {
  try {
    // 1. Check whether a summary already exists (idempotency guard)
    const [existing] = await db
      .select({ summary: meetings.summary })
      .from(meetings)
      .where(eq(meetings.id, meetingId));

    if (existing?.summary) {
      console.log(`Summary already exists for meeting ${meetingId}, skipping re-generation.`);
      return;
    }

    // 2. Fetch all conversation messages for this meeting
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.meetingId, meetingId))
      .orderBy(asc(conversationMessages.createdAt));

    // 3. If no messages recorded, skip (leave summary null)
    if (messages.length === 0) {
      console.log(`No conversation messages for meeting ${meetingId}, skipping summary.`);
      return;
    }

    // 4. Build a transcript string
    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n");

    // 5. Call Mistral API
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
            content:
              "Summarize this conversation between a user and an AI agent in 3-5 concise sentences, " +
              "highlighting the main topics discussed and any conclusions or action items. " +
              "Write in plain prose, no markdown formatting, no headings.",
          },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const summaryText: string =
      data.choices?.[0]?.message?.content ||
      "Conversation recorded but summary could not be generated.";

    // 6. Persist the summary on the meeting record
    await db
      .update(meetings)
      .set({ summary: summaryText })
      .where(eq(meetings.id, meetingId));

    console.log(`Summary generated for meeting ${meetingId}.`);
  } catch (error) {
    // Log but do not throw — summary failure shouldn't break the caller
    console.error(`generateMeetingSummary error for meeting ${meetingId}:`, error);
  }
}
