/**
 * Webhook replay test: signs realistic Stream webhook payloads with the app
 * secret (HMAC-SHA256 hex over the raw body — exactly how Stream computes the
 * X-Signature header) and POSTs them to a running server:
 *
 *   node scripts/test-webhook-replay.ts [baseURL]   (default http://localhost:3999)
 *
 * Run against a dev server started without a tunnel:
 *   npx next dev --webpack -p 3999        (separate terminal)
 *   npm run test:webhook-replay
 *
 * Uses a synthetic call id that matches no meeting, so the DB effects are
 * zero-row updates and the summary job exits with "meeting_not_found". Each
 * response status is asserted; payload details are never printed (keys and
 * sizes only, and only by the server logs).
 */
import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import zlib from "node:zlib";

const BASE_URL = process.argv[2] || "http://localhost:3999";
const ROUTE = "/api/webhooks/stream";
const MEETING_ID = `webhook-replay-test-${crypto.randomBytes(4).toString("hex")}`;
const CALL_CID = `default:${MEETING_ID}`;
const SECRET = process.env.STREAM_VIDEO_SECRET_KEY;
assert.ok(SECRET, "STREAM_VIDEO_SECRET_KEY must be set (present in .env)");

// The signature Stream sends: HMAC-SHA256 hex of the raw body, app secret as key.
function sign(rawBody: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(SECRET as string, "utf8"))
    .update(rawBody)
    .digest("hex");
}

function baseEvent(type: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    type,
    created_at: new Date().toISOString(),
    custom: { meetingId: MEETING_ID },
    call_cid: CALL_CID,
    call: { cid: CALL_CID, id: MEETING_ID, type: "default", graduated_at: null },
    ...extra,
  });
}

interface ReplayEvent {
  name: string;
  body: string;
  /* Never send an x-signature header. */
  omitSignature?: boolean;
  /* Sign this different raw text instead of the body (tamper simulation). */
  signBodyOverride?: string;
  /* HTTP-compress the body (the handler must decompress before verifying). */
  encoding?: "gzip";
  /* Assert the parsed eventType echoed back in the 200 response body. */
  expectEventType?: string;
}

const events: ReplayEvent[] = [
  { name: "call.session_started (signed)", body: baseEvent("call.session_started") },
  { name: "call.session_ended (signed)", body: baseEvent("call.session_ended", { call: { duration: 61 } }) },
  {
    name: "call.transcription_started (signed, unhandled type)",
    body: baseEvent("call.transcription_started", { call_transcription: { mode: "auto-on" } }),
  },
  {
    name: "call.transcription_ready (signed)",
    body: baseEvent("call.transcription_ready", {
      call_transcription: {
        url: `https://example.com/transcripts/${MEETING_ID}/session-1/transcript.jsonl`,
        filename: `${MEETING_ID}/session-1/transcript.jsonl`,
      },
    }),
    // Stream signs the DECOMPRESSED JSON (SDK: verifyAndParseWebhook verifies
    // over gunzipPayload(rawBody)); the body is sent HTTP-compressed with
    // content-encoding: gzip.
    expectEventType: "call.transcription_ready",
  },
  {
    name: "call.recording_ready (signed)",
    body: baseEvent("call.recording_ready", {
      call_recording: {
        url: `https://example.com/recordings/${MEETING_ID}/session-1/recording.mp4`,
        filename: `${MEETING_ID}/session-1/recording.mp4`,
      },
    }),
  },
  // Compressed replays: Stream compresses larger payloads. The signature is
  // computed over the uncompressed JSON; the handler must decompress first.
  {
    name: "call.session_ended (signed, gzip, content-encoding)",
    body: baseEvent("call.session_ended", { call: { duration: 62 } }),
    encoding: "gzip",
    expectEventType: "call.session_ended",
  },
  {
    name: "call.transcription_ready (signed, gzip)",
    body: baseEvent("call.transcription_ready", {
      call_transcription: {
        url: `https://example.com/transcripts/${MEETING_ID}/session-2/transcript.jsonl`,
        filename: `${MEETING_ID}/session-2/transcript.jsonl`,
      },
    }),
    encoding: "gzip",
    expectEventType: "call.transcription_ready",
  },
  // Negative cases: probes / tampering, mirroring the tunnel's 4xx mix.
  { name: "probe (empty body)", body: "", omitSignature: true },
  { name: "event without signature header", body: baseEvent("call.session_started"), omitSignature: true },
  {
    name: "tampered body (wrong signature)",
    body: baseEvent("call.session_started"),
    signBodyOverride: baseEvent("call.session_started").replace('"call_cid"', '"call_cid_tampered"'),
  },
  { name: "non-JSON body with valid signature", body: "not json at all" },
  { name: "JSON without a type field (signed)", body: JSON.stringify({ hello: "world" }) },
];

const EXPECTED: Record<string, number> = {
  "call.session_started (signed)": 200,
  "call.session_ended (signed)": 200,
  "call.transcription_started (signed, unhandled type)": 200,
  "call.transcription_ready (signed)": 200,
  "call.recording_ready (signed)": 200,
  "call.session_ended (signed, gzip, content-encoding)": 200,
  "call.transcription_ready (signed, gzip)": 200,
  "probe (empty body)": 200,
  "event without signature header": 400,
  "tampered body (wrong signature)": 401,
  "non-JSON body with valid signature": 400,
  "JSON without a type field (signed)": 200,
};

async function tryPost(
  e: ReplayEvent,
): Promise<{ status: number; eventType: string | null }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (!e.omitSignature) {
    headers["x-signature"] = sign(e.signBodyOverride ?? e.body);
  }
  let body: string | Uint8Array<ArrayBuffer> = e.body;
  if (e.encoding === "gzip") {
    // Signature over the UNCOMPRESSED bytes (per the SDK); send gzipped.
    // The copy forces a plain ArrayBuffer-backed view for fetch BodyInit.
    const gzipped = zlib.gzipSync(Buffer.from(e.body, "utf8"));
    const view = new Uint8Array(new ArrayBuffer(gzipped.length));
    view.set(gzipped);
    body = view;
    headers["content-encoding"] = "gzip";
  }
  const res = await fetch(`${BASE_URL}${ROUTE}`, {
    method: "POST",
    headers,
    body,
  });
  let eventType: string | null = null;
  try {
    eventType = ((await res.json()) as { eventType?: string | null }).eventType ?? null;
  } catch {
    eventType = null;
  }
  return { status: res.status, eventType };
}

let passed = 0;
const failures: string[] = [];

async function main() {
  for (const e of events) {
    try {
      const { status, eventType } = await tryPost(e);
      assert.equal(status, EXPECTED[e.name]);
      if (e.expectEventType) {
        assert.equal(
          eventType,
          e.expectEventType,
          "the handler must echo back the parsed eventType (parsing after decompression)",
        );
      }
      passed += 1;
      console.log(`PASS  ${e.name}: ${status}${eventType ? ` (${eventType})` : ""}`);
    } catch (error) {
      failures.push(e.name);
      console.error(
        `FAIL  ${e.name}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\n${passed}/${events.length} replay checks passed`);
  if (failures.length > 0) {
    console.error(`Failures: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
