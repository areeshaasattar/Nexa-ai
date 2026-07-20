import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
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