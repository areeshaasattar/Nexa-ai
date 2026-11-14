import assert from "node:assert/strict";
import { computeOnboardingSteps } from "../src/modules/home/lib/onboarding";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";

async function main() {
  // zero data
  let steps = computeOnboardingSteps({
    agentCount: 0,
    meetingCount: 0,
    hasJoinedCall: false,
    hasSummary: false,
  });
  assert.equal(steps.filter((s) => s.done).length, 0);
  assert.equal(steps[0].ctaLabel, "Go to agents");
  assert.equal(steps[0].href, "/agents");

  // agent only
  steps = computeOnboardingSteps({
    agentCount: 1,
    meetingCount: 0,
    hasJoinedCall: false,
    hasSummary: false,
  });
  assert.equal(steps[0].done, true);
  assert.equal(steps[1].done, false);

  // agent and meeting
  steps = computeOnboardingSteps({
    agentCount: 1,
    meetingCount: 1,
    hasJoinedCall: false,
    hasSummary: false,
  });
  assert.equal(steps[0].done, true);
  assert.equal(steps[1].done, true);
  assert.equal(steps[2].done, false);

  // meeting with startedAt counts as joined
  steps = computeOnboardingSteps({
    agentCount: 1,
    meetingCount: 1,
    hasJoinedCall: true,
    hasSummary: false,
  });
  assert.equal(steps[2].done, true);

  // meeting with summary counts as summary read
  steps = computeOnboardingSteps({
    agentCount: 1,
    meetingCount: 1,
    hasJoinedCall: true,
    hasSummary: true,
  });
  assert.equal(steps[3].done, true);
  assert.equal(steps.filter((s) => s.done).length, 4);

  // all done
  steps = computeOnboardingSteps({
    agentCount: 2,
    meetingCount: 3,
    hasJoinedCall: true,
    hasSummary: true,
    firstMeetingId: "m1",
  });
  assert.equal(steps.filter((s) => s.done).length, 4);
  assert.equal(steps[2].href, "/meetings/m1");

  // ordering stable
  const ids = computeOnboardingSteps({
    agentCount: 0,
    meetingCount: 0,
    hasJoinedCall: false,
    hasSummary: false,
  }).map((s) => s.id);
  assert.deepEqual(ids, ["create-agent", "schedule-meeting", "join-call", "read-summary"]);

  // robots and sitemap
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  assert.ok((rules.allow as string[]).includes("/"));
  assert.ok((rules.allow as string[]).includes("/terms"));
  assert.ok((rules.disallow as string[]).includes("/dashboard"));
  assert.ok((rules.disallow as string[]).includes("/api"));

  const sm = sitemap();
  const urls = sm.map((e) => e.url);
  assert.ok(urls.some((u) => u.endsWith("/")));
  assert.ok(urls.some((u) => u.endsWith("/terms")));
  assert.ok(urls.some((u) => u.endsWith("/privacy")));
  assert.ok(urls.some((u) => u.endsWith("/sign-in")));
  assert.ok(urls.some((u) => u.endsWith("/sign-up")));

  console.log("test:onboarding passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});