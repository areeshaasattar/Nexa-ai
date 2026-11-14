import assert from "node:assert/strict";
import { relativeTime, activityIconName, shouldHideDescription } from "../src/modules/home/lib/activity";

async function main() {
  const now = new Date("2026-11-14T12:00:00Z");

  // just now
  assert.equal(relativeTime(new Date(now.getTime() - 30_000), now), "just now");
  // minutes
  assert.equal(relativeTime(new Date(now.getTime() - 5 * 60_000), now), "5 minutes ago");
  assert.equal(relativeTime(new Date(now.getTime() - 1 * 60_000), now), "1 minute ago");
  // hours
  assert.equal(relativeTime(new Date(now.getTime() - 2 * 3600_000), now), "2 hours ago");
  // yesterday
  assert.equal(relativeTime(new Date(now.getTime() - 24 * 3600_000), now), "Yesterday");
  // future clamp
  assert.equal(relativeTime(new Date(now.getTime() + 10_000), now), "just now");
  // older
  const older = relativeTime(new Date("2026-10-01T00:00:00Z"), now);
  assert.ok(typeof older === "string");

  // activityIconName
  assert.equal(activityIconName("meeting_created"), "calendar");
  assert.equal(activityIconName("meeting_started"), "play");
  assert.equal(activityIconName("meeting_completed"), "check-circle");
  assert.equal(activityIconName("agent_created"), "bot");
  assert.equal(activityIconName("transcription_ready"), "file-text");
  assert.equal(activityIconName("something_unknown"), "activity");

  // shouldHideDescription
  assert.equal(shouldHideDescription("Title", "Title"), true);
  assert.equal(shouldHideDescription("Title", "Title extra"), true);
  assert.equal(shouldHideDescription("Title", null), true);
  assert.equal(shouldHideDescription("Title", "Different text"), false);

  console.log("test:shell-helpers passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});