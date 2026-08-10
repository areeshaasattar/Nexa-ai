import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkChatRateLimit } from "@/lib/rate-limit";

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

    const { prompt, agentId } = await req.json();

    if (!prompt || !agentId) {
      return NextResponse.json({ error: "Missing prompt or agentId" }, { status: 400 });
    }

    // Fetch agent instructions
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId));

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

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
          { role: "system", content: agent.instruction },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral Error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "No response from AI.";

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}