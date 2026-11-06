import { streamVideo } from "@/lib/stream-video";
import { db } from "@/db";
import { meetings, activities } from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { after } from "next/server";
import zlib from "node:zlib";
import { generateMeetingSummary } from "@/lib/meeting-summary";

/**
 * Insert a dashboard activity once per meeting: webhook events can be
 * delivered more than once, so the metadata column carries the meeting id
 * and an existing matching activity suppresses the duplicate row.
 */
async function logStreamActivityOnce(
  meetingId: string,
  type: "recording_ready" | "transcription_done",
  titlePrefix: string,
  description: string,
): Promise<void> {
  const [meeting] = await db
    .select({ userId: meetings.userId, name: meetings.name })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) return;

  const metadata = JSON.stringify({ meetingId });
  const [existing] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.userId, meeting.userId),
        eq(activities.type, type),
        // Legacy rows have no metadata; the like clause can't match them.
        like(activities.metadata, `%"${meetingId}"%`),
      ),
    )
    .limit(1);
  if (existing) return;

  await db.insert(activities).values({
    userId: meeting.userId,
    type,
    title: `${titlePrefix}: ${meeting.name}`,
    description: `${description} for "${meeting.name}".`,
    metadata,
  });
}

export async function POST(req: Request) {
  // Per-request diagnostic (log FIRST, before any decision): header NAMES
  // only (never values), body byte length, signature verdict and the event
  // type if the body is parseable. No content, no secrets.
  const headerNames = [...req.headers.keys()];

  // The signature is an HMAC over the raw body bytes, so the raw text must
  // be read before anything else and verification must happen before the
  // authoritative JSON.parse (@stream-io/node-sdk: StreamClient.verifyWebhook
  // hashes the bytes passed in with HMAC-SHA256 over the app secret; the
  // header carrying it is X-Signature).
  //
  // IMPORTANT: Stream may send the payload HTTP-compressed (content-encoding:
  // gzip etc.). Per the installed SDK (verifyAndParseWebhook = verify over
  // gunzipPayload(rawBody)), the X-Signature is computed over the
  // DECOMPRESSED JSON bytes, so the body must be decompressed before
  // verification — hashing the compressed bytes verbatim yields "invalid".
  const rawBytes = Buffer.from(await req.arrayBuffer());
  const contentEncoding = req.headers.get("content-encoding")?.trim().toLowerCase() || null;

  const bodyBytes = rawBytes.length;
  const signature = req.headers.get("x-signature");

  // Decompress when needed (mirror of the SDK's gunzipPayload, extended with
  // the content-encoding values Stream can send). Detection is by gzip magic
  // bytes first (same as the SDK), so upstream proxies that strip the header
  // are still handled; deflate/br have no reliable magic and rely on the
  // header. When the runtime already decompressed, header+magic checks
  // simply find nothing to do.
  let encodedBytes: Buffer = rawBytes;
  let decompressed: boolean | string = false;
  const isGzip = rawBytes.length >= 2 && rawBytes[0] === 0x1f && rawBytes[1] === 0x8b;
  try {
    if (isGzip) {
      encodedBytes = zlib.gunzipSync(rawBytes);
      decompressed = true;
    } else if (contentEncoding === "deflate") {
      encodedBytes = zlib.inflateSync(rawBytes);
      decompressed = true;
    } else if (contentEncoding === "br") {
      encodedBytes = zlib.brotliDecompressSync(rawBytes);
      decompressed = true;
    }
  } catch {
    // Decompression failed: verify against the raw bytes; the signature
    // verdict (below) decides the outcome.
    decompressed = "failed";
  }
  const rawBody = encodedBytes.toString("utf8");

  // An empty body is not a webhook event at all (tunnel/monitoring probes
  // often POST without a payload). Nothing can be processed, so we ack with
  // 200 instead of 400: this keeps Stream and the tunnel metrics free of
  // meaningless 4xx noise. Still logged so probes stay observable.
  if (!rawBody.trim()) {
    console.log(
      JSON.stringify({
        event: "webhook.request",
        headerNames,
        bodyBytes,
        bodyDecompressed: decompressed,
        contentEncoding,
        signatureResult: "skipped: empty body",
        eventType: null,
      }),
    );
    return NextResponse.json({ message: "Ignored: empty body" });
  }

  let signatureResult: "valid" | "invalid" | "missing";
  if (!signature) {
    signatureResult = "missing";
  } else {
    signatureResult = streamVideo.verifyWebhook(rawBody, signature)
      ? "valid"
      : "invalid";
  }

  // Peek the event type for the log only when the signature is valid; the
  // authoritative parse used for processing happens after verification.
  // Only *unparseable* bodies are malformed; a JSON body without a type
  // field is not malformed — it's an ignorable non-event (200 below).
  let eventType: string | null = null;
  let malformed = false;
  if (signatureResult === "valid") {
    try {
      const peek = JSON.parse(rawBody) as { type?: unknown };
      if (peek && typeof peek === "object" && typeof peek.type === "string") {
        eventType = peek.type;
      }
    } catch {
      malformed = true;
    }
  }

  console.log(
    JSON.stringify({
      event: "webhook.request",
      headerNames,
      bodyBytes,
      bodyDecompressed: decompressed,
      contentEncoding,
      signatureResult,
      eventType,
    }),
  );

  try {
    // Every webhook event is signed; a request without the header cannot be
    // authenticated at all, so it is rejected before any processing.
    if (signatureResult === "missing") {
      return new NextResponse("No signature", { status: 400 });
    }
    if (signatureResult === "invalid") {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    // Only a truly malformed body (non-JSON or no event shape) is a 400.
    if (malformed) {
      return new NextResponse("Invalid JSON", { status: 400 });
    }

    const event: unknown = JSON.parse(rawBody);
    const callCid = (event as { call_cid?: string }).call_cid;
    const [, id] = (callCid ?? "").split(":");

    // Handle session start
    if (eventType === "call.session_started") {
      if (id) {
        await db
          .update(meetings)
          .set({ status: "ongoing", startedAt: new Date() })
          .where(eq(meetings.id, id));
      }
    }

    // Handle session end
    if (eventType === "call.session_ended") {
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
    if (eventType === "call.recording_ready") {
      const recording = (event as { call_recording?: { url?: string } })
        .call_recording;
      const url = recording?.url;
      if (id && url) {
        await db
          .update(meetings)
          .set({ recordingUrl: url })
          .where(eq(meetings.id, id));

        await logStreamActivityOnce(id, "recording_ready", "Recording Ready", "Recording is available");
      }
    }

    // Handle transcription ready
    if (eventType === "call.transcription_ready") {
      const transcription = (event as {
        call_transcription?: { url?: string; filename?: string };
      }).call_transcription;

      // Diagnostic shape log: keys and sizes only, never payload content.
      console.log(
        JSON.stringify({
          event: "webhook.transcription_ready",
          payloadKeys: Object.keys(event as Record<string, unknown>),
          transcriptKeys: transcription ? Object.keys(transcription) : [],
          urlLength: transcription?.url?.length ?? 0,
          filenameLength: transcription?.filename?.length ?? 0,
        }),
      );

      const url = transcription?.url;
      if (id && url) {
        await db
          .update(meetings)
          .set({ transcriptUrl: url })
          .where(eq(meetings.id, id));

        // Regenerate summary now that the transcript is available. The
        // generator itself only regenerates when the existing summary came
        // from the conversation fallback, so repeated webhook deliveries
        // never cost extra model calls beyond one regeneration.
        await logStreamActivityOnce(id, "transcription_done", "Transcription Ready", "Transcription is available");

        after(() => {
          generateMeetingSummary(id).catch((error) => {
            console.error(`generateMeetingSummary failed for meeting ${id}:`, error);
          });
        });
      }
    }

    // Every signed, well-formed webhook is acked with 200 — including event
    // types this handler does not act on (e.g. call.transcription_started).
    // Non-2xx responses make Stream retry, so unknown types must never 400.
    return NextResponse.json({ message: "Webhook processed", eventType });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}