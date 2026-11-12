import assert from "node:assert/strict";
import { LIMITS } from "../src/lib/limits";
import { checkLimit, setRateLimitBackendForTests, type RateLimitName } from "../src/lib/rate-limit";
import { AGENT_TEMPLATES, STARTER_AGENT_TEMPLATE_ID } from "../src/lib/agent-templates";

function makeBackend(opts?: { throwOnName?: RateLimitName; limits?: Partial<Record<RateLimitName, number>> }) {
  const counts = new Map<string, number>();
  return {
    async limit(name: RateLimitName, key: string) {
      if (opts?.throwOnName === name) {
        throw new Error("backend boom");
      }
      const limit = opts?.limits?.[name] ?? 2;
      const mapKey = `${name}:${key}`;
      const next = (counts.get(mapKey) ?? 0) + 1;
      counts.set(mapKey, next);
      const remaining = Math.max(0, limit - next);
      return {
        success: next <= limit,
        limit,
        remaining,
        reset: Date.now() + 60_000,
      };
    },
  };
}

async function main() {
  // Stubbed backend: first N allowed, N+1 blocked; retryAfter positive when blocked.
  setRateLimitBackendForTests(makeBackend({ limits: { "chat.minute": 2 } }));
  const r1 = await checkLimit("chat.minute", "u1");
  const r2 = await checkLimit("chat.minute", "u1");
  const r3 = await checkLimit("chat.minute", "u1");
  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, false);
  assert.ok(r3.retryAfterSeconds > 0, "retryAfterSeconds must be positive when blocked");

  // Different keys have independent counters.
  const other = await checkLimit("chat.minute", "u2");
  assert.equal(other.allowed, true);

  // Distinct limiter names do not share counters.
  setRateLimitBackendForTests(makeBackend({ limits: { "chat.minute": 1, "chat.day": 1 } }));
  assert.equal((await checkLimit("chat.minute", "u3")).allowed, true);
  assert.equal((await checkLimit("chat.minute", "u3")).allowed, false);
  assert.equal((await checkLimit("chat.day", "u3")).allowed, true, "different limiter name must not share counter");

  // Backend that throws => allowed true (fail open) and does not throw.
  setRateLimitBackendForTests(makeBackend({ throwOnName: "chat.minute" }));
  const failOpen = await checkLimit("chat.minute", "u4");
  assert.equal(failOpen.allowed, true);

  // Missing configuration => allowed true (restore default, ensure no env vars required by stub path off).
  setRateLimitBackendForTests(null);
  // In test env without UPSTASH vars this should allow; if vars exist, behavior is still allowed only by real check,
  // so force-check the config-missing path by temporarily clearing env.
  const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
  const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const missing = await checkLimit("chat.minute", "u5");
  assert.equal(missing.allowed, true, "missing configuration must result in allowed true");
  if (prevUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = prevUrl;
  if (prevToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;

  // Limits config has every key listed in section 1 and Brainstorm Partner fits instruction cap.
  assert.ok(LIMITS.chat.perMinute > 0);
  assert.equal(LIMITS.chat.perDay, 300);
  assert.equal(LIMITS.createCall.perHour, 15);
  assert.equal(LIMITS.createCall.perDay, 40);
  assert.equal(LIMITS.getToken.perHour, 60);
  assert.equal(LIMITS.retrySummary.perHourPerUser, 5);
  assert.equal(LIMITS.retrySummary.perDayPerMeeting, 3);
  assert.equal(LIMITS.feedback.createPerHour, 5);
  assert.equal(LIMITS.quickStart.perHour, 10);
  assert.equal(LIMITS.logVoiceInteraction.perHour, 120);
  assert.equal(LIMITS.email.resendVerificationWindowSeconds, 60);
  assert.equal(LIMITS.email.resendVerificationPerDay, 10);
  assert.equal(LIMITS.email.globalPerDay, 250);
  assert.equal(LIMITS.quotas.maxAgentsPerUser, 25);
  assert.equal(LIMITS.quotas.maxMeetingsPerUser, 200);
  assert.equal(LIMITS.textCaps.agentName, 80);
  assert.equal(LIMITS.textCaps.agentInstruction, 4000);
  assert.equal(LIMITS.textCaps.meetingName, 120);
  assert.equal(LIMITS.textCaps.meetingInstructions, 2000);
  assert.equal(LIMITS.textCaps.feedbackMessageMin, 5);
  assert.equal(LIMITS.textCaps.feedbackMessageMax, 1000);
  assert.equal(LIMITS.mistral.chatMaxTokens, 250);
  assert.equal(LIMITS.stream.callMaxDurationMinutes, 60);
  const starter = AGENT_TEMPLATES.find((t) => t.id === STARTER_AGENT_TEMPLATE_ID);
  assert.ok(starter, "starter template must exist");
  assert.ok(
    starter.instruction.length <= LIMITS.textCaps.agentInstruction,
    "Brainstorm Partner instruction must fit instruction cap",
  );

  console.log(
    JSON.stringify(
      {
        event: "test.limits.pass",
        checks: [
          "allow_then_block_with_positive_retryAfter",
          "independent_keys",
          "independent_limiter_names",
          "backend_throw_fail_open",
          "missing_config_allow",
          "limits_config_complete",
          "starter_instruction_within_cap",
        ],
      },
      null,
      2,
    ),
  );
}

void main();