import { streamVideo } from "@/lib/stream-video";
import { db } from "@/db";
import { meetings, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { generateMeetingSummary } from "@/lib/meeting-summary";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new NextResponse("Empty body", { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new NextResponse("Invalid JSON", { status: 400 });
    }

    const signature = req.headers.get("x-signature");
    if (!signature) {
      return new NextResponse("No signature", { status: 400 });
    }

    const valid = streamVideo.verifyWebhook(rawBody, signature);
    if (!valid) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const event = body;
    if (!event || !event.type) {
      return NextResponse.json({ message: "Payload ignored" });
    }

    const callCid = event.call_cid as string | undefined;
    const [, id] = (callCid ?? "").split(":");

    // Handle session start
    if (event.type === "call.session_started") {
      if (id) {
        await db
          .update(meetings)
          .set({ status: "ongoing", startedAt: new Date() })
          .where(eq(meetings.id, id));
      }
    }

    // Handle session end
    if (event.type === "call.session_ended") {
      if (id) {
        await db
          .update(meetings)
          .set({ status: "completed", endedAt: new Date() })
          .where(eq(meetings.id, id));

        after(() => {
          generateMeetingSummary(id).catch((error) => {
            console.error(`generateMeetingSummary failed for meeting ${id}:`, error);
          });
        });
      }
    }

    // Handle recording ready
    if (event.type === "call.recording_ready") {
      const recording = event.call_recording as { url?: string } | undefined;
      const url = recording?.url;
      if (id && url) {
        await db
          .update(meetings)
          .set({ recordingUrl: url })
          .where(eq(meetings.id, id));

        const [meeting] = await db
          .select({ userId: meetings.userId, name: meetings.name })
          .from(meetings)
          .where(eq(meetings.id, id));
        if (meeting) {
          await db.insert(activities).values({
            userId: meeting.userId,
            type: "recording_ready",
            title: `Recording Ready: ${meeting.name}`,
            description: `Recording is available for "${meeting.name}".`,
          });
        }
      }
    }

    // Handle transcription ready
    if (event.type === "call.transcription_ready") {
      const transcription = event.call_transcription as { url?: string } | undefined;
      const url = transcription?.url;
      if (id && url) {
        await db
          .update(meetings)
          .set({ transcriptUrl: url })
          .where(eq(meetings.id, id));

        const [meeting] = await db
          .select({ userId: meetings.userId, name: meetings.name })
          .from(meetings)
          .where(eq(meetings.id, id));
        if (meeting) {
          await db.insert(activities).values({
            userId: meeting.userId,
            type: "transcription_done",
            title: `Transcription Ready: ${meeting.name}`,
            description: `Transcription is available for "${meeting.name}".`,
          });
        }

        // Regenerate summary now that the transcript is available.
        after(() => {
          generateMeetingSummary(id).catch((error) => {
            console.error(`generateMeetingSummary failed for meeting ${id}:`, error);
          });
        });
      }
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}