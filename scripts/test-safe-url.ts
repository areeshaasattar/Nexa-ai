import assert from "node:assert/strict";
import {
  validateAssetUrl,
  fetchTextLimited,
  getAllowedAssetHosts,
  isIpLiteral,
} from "../src/lib/safe-url";
// fetchTranscriptText is loaded lazily to avoid importing the DB module at top level.

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r && typeof (r as Promise<void>).then === "function") {
      (r as Promise<void>).then(() => { passed++; console.log("PASS", name); }).catch((e) => { failed++; console.error("FAIL", name, e?.message ?? e); });
      return;
    }
    passed++;
    console.log("PASS", name);
  } catch (e) {
    failed++;
    console.error("FAIL", name, (e as Error)?.message ?? e);
  }
}

const ALLOWED = ["stream.com"];

// validator rejects
const rejectCases = [
  "http://stream.com/x",
  "file://stream.com/x",
  "https://user:pw@stream.com/x",
  "https://stream.com.evil.com/x",
  "https://evil.com/stream.com",
  "https://stream.com:8443/x",
  "https://127.0.0.1/",
  "https://[::1]/",
  "https://169.254.169.254/",
  "https://2130706433/",
  "https://0x7f000001/",
  "",
  "not a url",
];
for (const u of rejectCases) {
  test(`validator rejects: ${u || "<empty>"}`, () => {
    const r = validateAssetUrl(u, ALLOWED);
    assert.equal(r.ok, false);
  });
}

test("validator rejects empty allowlist", () => {
  const r = validateAssetUrl("https://stream.com/x", []);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "allowlist_empty");
});

test("validator accepts allowed host", () => {
  const r = validateAssetUrl("https://stream.com/x", ALLOWED);
  assert.equal(r.ok, true);
});
test("validator accepts subdomain of allowed suffix", () => {
  const r = validateAssetUrl("https://cdn.stream.com/x", ALLOWED);
  assert.equal(r.ok, true);
});
test("validator accepts mixed-case hostname", () => {
  const r = validateAssetUrl("https://Stream.COM/x", ALLOWED);
  assert.equal(r.ok, true);
});
test("validator rejects evil-stream.com matching stream.com", () => {
  const r = validateAssetUrl("https://evil-stream.com/x", ALLOWED);
  assert.equal(r.ok, false);
});

// fetchTextLimited with injected fetchImpl
test("fetchTextLimited: 3xx -> failure", async () => {
  const fetchImpl = async () => new Response(null, { status: 302, headers: { Location: "https://x" } });
  const r = await fetchTextLimited("https://stream.com/x", { fetchImpl: fetchImpl as unknown as typeof fetch });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "redirect");
});

test("fetchTextLimited: body over maxBytes -> failure", async () => {
  const body = "a".repeat(100);
  const fetchImpl = async () => new Response(body, { status: 200 });
  const r = await fetchTextLimited("https://stream.com/x", { fetchImpl: fetchImpl as unknown as typeof fetch, maxBytes: 10 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "too_large");
});

test("fetchTextLimited: never-resolving fetch -> timeout failure", async () => {
  const fetchImpl = () => new Promise<Response>(() => {});
  const r = await fetchTextLimited("https://stream.com/x", { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 50 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "timeout");
});

test("fetchTextLimited: 500 then 200 -> success after retry", async () => {
  let n = 0;
  const fetchImpl = async () => {
    n++;
    if (n === 1) return new Response("err", { status: 500 });
    return new Response("ok", { status: 200 });
  };
  const r = await fetchTextLimited("https://stream.com/x", { fetchImpl: fetchImpl as unknown as typeof fetch });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.text, "ok");
});

test("fetchTextLimited: 500 twice -> failure", async () => {
  const fetchImpl = async () => new Response("err", { status: 500 });
  const r = await fetchTextLimited("https://stream.com/x", { fetchImpl: fetchImpl as unknown as typeof fetch });
  assert.equal(r.ok, false);
});

// fetchTranscriptText returns null on invalid URL / empty allowlist
test("fetchTranscriptText returns null on invalid URL", async () => {
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  process.env.STREAM_ASSET_HOSTS = "stream.com";
  const { fetchTranscriptText } = await import("../src/lib/meeting-summary");
  const r = await fetchTranscriptText("http://stream.com/x", {});
  assert.equal(r, null);
});
test("fetchTranscriptText returns null on empty allowlist", async () => {
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  process.env.STREAM_ASSET_HOSTS = "";
  const { fetchTranscriptText } = await import("../src/lib/meeting-summary");
  const r = await fetchTranscriptText("https://stream.com/x", {});
  assert.equal(r, null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;