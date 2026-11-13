import assert from "node:assert/strict";
import {
  SUMMARY_PROVIDER_BASE_DELAYS_MS,
  SUMMARY_PROVIDER_MAX_ATTEMPTS,
  SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS,
  getProviderRetryDelayMs,
  isRetryableProviderFailure,
  jitterDelayMs,
  parseRetryAfterMs,
  shouldRetryProviderFailure,
} from "../src/lib/summary-backoff";
import {
  callMistralForSummary,
  createProviderAttemptBudget,
} from "../src/lib/summary-mistral";

type FetchStub = (input: unknown, init?: RequestInit) => Promise<Response>;

async function withFetch<T>(stub: FetchStub, fn: () => Promise<T>): Promise<T> {
  const prev = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = prev;
  }
}

function jsonResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  });
}

async function main() {
  // Delay schedule: base delays with jitter bounds, Retry-After honored and capped.
  assert.deepEqual([...SUMMARY_PROVIDER_BASE_DELAYS_MS], [2000, 6000, 15000]);

  // Jitter +/-20%
  assert.equal(jitterDelayMs(1000, 0), 800);
  assert.equal(jitterDelayMs(1000, 0.5), 1000);
  assert.equal(jitterDelayMs(1000, 1), 1200);

  const d1 = getProviderRetryDelayMs({ retryIndex: 1, randomValue: 0 }); // 2s base
  const d2 = getProviderRetryDelayMs({ retryIndex: 2, randomValue: 1 }); // 6s base
  const d3 = getProviderRetryDelayMs({ retryIndex: 3, randomValue: 0.5 }); // 15s base
  assert.equal(d1, 1600);
  assert.equal(d2, 7200);
  assert.equal(d3, 15000);

  // Retry-After (seconds) honored and capped at 20s
  assert.equal(parseRetryAfterMs("5", 0), 5000);
  assert.equal(parseRetryAfterMs("30", 0), SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS);
  assert.equal(
    getProviderRetryDelayMs({
      retryIndex: 1,
      retryAfterHeader: "10",
      randomValue: 1,
    }),
    10000,
  );
  assert.equal(
    getProviderRetryDelayMs({
      retryIndex: 1,
      retryAfterHeader: "120",
      randomValue: 0,
    }),
    SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS,
  );

  // Retry-After (HTTP-date) honored and capped
  const now = Date.UTC(2026, 10, 13, 12, 0, 0);
  const in5s = new Date(now + 5000).toUTCString();
  const in30s = new Date(now + 30000).toUTCString();
  assert.equal(parseRetryAfterMs(in5s, now), 5000);
  assert.equal(parseRetryAfterMs(in30s, now), SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS);

  // Retry decision
  assert.equal(isRetryableProviderFailure(429), true);
  assert.equal(isRetryableProviderFailure(500), true);
  assert.equal(isRetryableProviderFailure(503), true);
  assert.equal(isRetryableProviderFailure("network"), true);
  assert.equal(isRetryableProviderFailure("timeout"), true);
  assert.equal(isRetryableProviderFailure(400), false);
  assert.equal(isRetryableProviderFailure(401), false);
  assert.equal(isRetryableProviderFailure(403), false);
  assert.equal(isRetryableProviderFailure(404), false);

  assert.equal(shouldRetryProviderFailure({ status: 429, attempt: 1, maxAttempts: 4 }), true);
  assert.equal(shouldRetryProviderFailure({ status: 500, attempt: 3, maxAttempts: 4 }), true);
  assert.equal(shouldRetryProviderFailure({ status: "network", attempt: 4, maxAttempts: 4 }), false);
  assert.equal(shouldRetryProviderFailure({ status: 400, attempt: 1, maxAttempts: 4 }), false);
  assert.equal(shouldRetryProviderFailure({ status: 401, attempt: 1, maxAttempts: 4 }), false);

  // Max total attempts 4 and 429-exhausted yields provider_busy without throwing.
  await withFetch(
    async () => jsonResponse(429, { error: "rate_limited" }),
    async () => {
      const sleeps: number[] = [];
      const budget = createProviderAttemptBudget(SUMMARY_PROVIDER_MAX_ATTEMPTS);
      const res = await callMistralForSummary({
        meetingId: "m1",
        model: "mistral-small-latest",
        apiKey: "k",
        messages: [{ role: "user", content: "hi" }],
        budget,
        random: () => 0.5,
        sleepFn: async (ms) => {
          sleeps.push(ms);
        },
      });
      assert.equal(res.ok, false);
      if (res.ok) throw new Error("expected failure");
      assert.equal(res.reason, "provider_busy");
      assert.equal(res.providerAttempts, 4);
      assert.equal(budget.used, 4);
      // 3 retries after first 3 failed attempts (base schedule, no Retry-After)
      assert.deepEqual(sleeps, [2000, 6000, 15000]);
    },
  );

  // 5xx/network also exhaust to provider_busy (transient)
  await withFetch(
    async () => {
      throw new Error("network down");
    },
    async () => {
      const sleeps: number[] = [];
      const res = await callMistralForSummary({
        meetingId: "m2",
        model: "mistral-small-latest",
        apiKey: "k",
        messages: [{ role: "user", content: "hi" }],
        random: () => 0.5,
        sleepFn: async (ms) => {
          sleeps.push(ms);
        },
      });
      assert.equal(res.ok, false);
      if (res.ok) throw new Error("expected failure");
      assert.equal(res.reason, "provider_busy");
      assert.equal(res.providerAttempts, 4);
      assert.equal(sleeps.length, 3);
    },
  );

  // Non-retryable statuses do not retry
  for (const status of [400, 401, 403, 404] as const) {
    await withFetch(
      async () => jsonResponse(status, { error: "bad" }),
      async () => {
        const sleeps: number[] = [];
        const res = await callMistralForSummary({
          meetingId: "m3",
          model: "mistral-small-latest",
          apiKey: "k",
          messages: [{ role: "user", content: "hi" }],
          sleepFn: async (ms) => {
            sleeps.push(ms);
          },
        });
        assert.equal(res.ok, false);
        if (res.ok) throw new Error("expected failure");
        assert.equal(res.reason, "provider_error");
        assert.equal(res.providerAttempts, 1);
        assert.deepEqual(sleeps, []);
      },
    );
  }

  // Success on the 2nd attempt returns normally
  let attemptCount = 0;
  await withFetch(
    async () => {
      attemptCount += 1;
      if (attemptCount === 1) return jsonResponse(429, { error: "busy" }, { "Retry-After": "1" });
      return jsonResponse(200, {
        choices: [{ message: { content: "{\"ok\":true}" } }],
      });
    },
    async () => {
      const sleeps: number[] = [];
      const res = await callMistralForSummary({
        meetingId: "m4",
        model: "mistral-small-latest",
        apiKey: "k",
        messages: [{ role: "user", content: "hi" }],
        random: () => 0.5,
        sleepFn: async (ms) => {
          sleeps.push(ms);
        },
      });
      assert.equal(attemptCount, 2);
      assert.equal(res.ok, true);
      if (!res.ok) throw new Error("expected success");
      assert.equal(res.content, "{\"ok\":true}");
      assert.equal(res.providerAttempts, 2);
      assert.deepEqual(sleeps, [1000]); // Retry-After honored (1s)
    },
  );

  console.log(
    "test:summary-backoff passed (delay/jitter/retry-after, retry decisions, max attempts, provider_busy exhaustion, 2nd-attempt success)",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
