import assert from "node:assert/strict";
import { summaryEmail } from "../src/lib/email-templates";
import {
  decideSummaryEmail,
  hasMeaningfulSummaryContent,
} from "../src/lib/summary-email";
import type { StoredMeetingSummary } from "../src/lib/summary-schema";

function baseSummaryData(overrides: Partial<StoredMeetingSummary> = {}): StoredMeetingSummary {
  return {
    overview: "We aligned on launch scope.",
    decisions: ["Ship v1 next week"],
    actionItems: [{ task: "Prepare release notes", owner: "Ada", dueDate: null }],
    topics: ["Launch"],
    openQuestions: [],
    meta: { kind: "structured" },
    ...overrides,
  };
}

function main() {
  const meetingUrl = "https://app.example.com/meetings/m_123";
  const settingsUrl = "https://app.example.com/settings?tab=account";

  // Template: non-empty subject/html/text and meeting URL appears
  const tpl = summaryEmail({
    name: "Ada",
    meetingName: "Weekly Sync",
    durationText: "30 min",
    overview: "Discussed progress.",
    decisions: ["Keep scope stable"],
    actionItems: [{ task: "Send notes", owner: "Ada", dueDate: "Friday" }],
    topics: ["Progress"],
    openQuestions: ["When to demo?"],
    meetingUrl,
    settingsUrl,
  });
  assert.ok(tpl.subject.trim().length > 0, "subject non-empty");
  assert.ok(tpl.html.trim().length > 0, "html non-empty");
  assert.ok(tpl.text.trim().length > 0, "text non-empty");
  assert.ok(tpl.html.includes(meetingUrl), "meeting URL in html");
  assert.ok(tpl.text.includes(meetingUrl), "meeting URL in text");

  // Malicious content escaped in html
  const xss = summaryEmail({
    name: "Ada",
    meetingName: 'Launch <script>alert(1)</script> "Q1"',
    overview: "Safe overview",
    decisions: [],
    actionItems: [
      { task: '<img src=x onerror=alert(1)> "task"', owner: null, dueDate: null },
    ],
    topics: [],
    openQuestions: [],
    meetingUrl,
    settingsUrl,
  });
  assert.ok(!xss.html.includes("<script>alert(1)</script>"), "meeting name script escaped");
  assert.ok(!xss.html.includes("<img src=x onerror=alert(1)>"), "action item escaped");
  assert.ok(xss.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "escaped script present");
  assert.ok(xss.html.includes("&lt;img"), "escaped tag present");
  assert.ok(xss.html.includes("&quot;"), "quotes escaped");

  // Empty sections omitted
  const empty = summaryEmail({
    name: "Ada",
    meetingName: "Quiet meeting",
    overview: "Nothing major.",
    decisions: [],
    actionItems: [],
    topics: [],
    openQuestions: [],
    meetingUrl,
    settingsUrl,
  });
  assert.ok(!empty.html.includes(">Decisions<"), "decisions omitted");
  assert.ok(!empty.html.includes(">Action items<"), "action items omitted");
  assert.ok(!empty.html.includes(">Topics<"), "topics omitted");
  assert.ok(!empty.html.includes(">Open questions<"), "open questions omitted");
  assert.ok(!empty.text.includes("\nDecisions\n"), "decisions omitted in text");
  assert.ok(!empty.text.includes("\nAction items\n"), "action items omitted in text");
  assert.ok(!empty.text.includes("\nTopics\n"), "topics omitted in text");
  assert.ok(!empty.text.includes("\nOpen questions\n"), "open questions omitted in text");

  // List and length caps enforced (20 items of 1000 chars)
  const longItem = "x".repeat(1000);
  const capped = summaryEmail({
    name: "Ada",
    meetingName: "Big meeting",
    overview: "y".repeat(2000),
    decisions: Array.from({ length: 20 }, (_, i) => `${i}-${longItem}`),
    actionItems: Array.from({ length: 20 }, (_, i) => ({
      task: `${i}-${longItem}`,
      owner: null,
      dueDate: null,
    })),
    topics: Array.from({ length: 20 }, (_, i) => `${i}-${longItem}`),
    openQuestions: Array.from({ length: 20 }, (_, i) => `${i}-${longItem}`),
    meetingUrl,
    settingsUrl,
  });
  // max 8 list items rendered
  assert.ok(!capped.html.includes(">8-"), "decisions capped at 8");
  assert.ok(!capped.text.includes("\n- 8-"), "decisions capped at 8 in text");
  assert.ok(capped.html.includes(">7-"), "7th item present");
  // each item and overview truncated (ellipsis)
  assert.ok(capped.html.includes("…"), "truncation ellipsis present");
  assert.ok(!capped.html.includes("x".repeat(350)), "items truncated");
  assert.ok(!capped.html.includes("y".repeat(1300)), "overview truncated");

  // Null action-item owner renders without the word "null"
  const noOwner = summaryEmail({
    name: "Ada",
    meetingName: "Ownerless",
    overview: "Overview",
    decisions: [],
    actionItems: [{ task: "Do thing", owner: null, dueDate: null }],
    topics: [],
    openQuestions: [],
    meetingUrl,
    settingsUrl,
  });
  assert.ok(!/\bnull\b/i.test(noOwner.html), "html must not contain word null");
  assert.ok(!/\bnull\b/i.test(noOwner.text), "text must not contain word null");
  assert.ok(noOwner.html.includes("Do thing"));

  // Subject truncation at 80 chars
  const longName = "A".repeat(120);
  const subj = summaryEmail({
    name: "Ada",
    meetingName: longName,
    overview: "Overview",
    decisions: [],
    actionItems: [],
    topics: [],
    openQuestions: [],
    meetingUrl,
    settingsUrl,
  });
  const prefix = "Summary: ";
  assert.ok(subj.subject.startsWith(prefix), "subject prefix");
  const namePart = subj.subject.slice(prefix.length);
  assert.ok(namePart.length <= 80, `meeting name in subject <= 80 chars, got ${namePart.length}`);
  assert.ok(namePart.endsWith("…"), "truncated subject ends with ellipsis");

  // Decision logic (pure) tests
  const now = new Date("2026-11-13T12:00:00Z");
  const recent = { endedAt: new Date("2026-11-13T02:00:00Z") }; // 10h ago
  const owner = { email: "ada@example.com", summaryEmailsEnabled: true };

  assert.deepEqual(
    decideSummaryEmail({ meeting: null, owner, now }),
    { action: "skip", reason: "meeting_not_found" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: { summaryEmailSentAt: new Date(), endedAt: recent.endedAt, summaryData: baseSummaryData() },
      owner,
      now,
    }),
    { action: "skip", reason: "already_sent" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: { summaryEmailSentAt: null, endedAt: recent.endedAt, summaryData: baseSummaryData() },
      owner: { ...owner, summaryEmailsEnabled: false },
      now,
    }),
    { action: "skip", reason: "opted_out" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: { summaryEmailSentAt: null, endedAt: recent.endedAt, summaryData: baseSummaryData({ meta: { kind: "insufficient" } }) },
      owner,
      now,
    }),
    { action: "skip", reason: "not_normal_kind" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: { summaryEmailSentAt: null, endedAt: recent.endedAt, summaryData: baseSummaryData({ meta: { kind: "fallback", reason: "x" } }) },
      owner,
      now,
    }),
    { action: "skip", reason: "not_normal_kind" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: {
        summaryEmailSentAt: null,
        endedAt: recent.endedAt,
        summaryData: {
          overview: "   ",
          decisions: [],
          actionItems: [],
          topics: [],
          openQuestions: [],
          meta: { kind: "structured" },
        },
      },
      owner,
      now,
    }),
    { action: "skip", reason: "empty_content" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: {
        summaryEmailSentAt: null,
        endedAt: new Date("2026-11-10T00:00:00Z"), // > 24h old
        summaryData: baseSummaryData(),
      },
      owner,
      now,
    }),
    { action: "skip", reason: "too_old" },
  );
  assert.deepEqual(
    decideSummaryEmail({
      meeting: { summaryEmailSentAt: null, endedAt: recent.endedAt, summaryData: baseSummaryData() },
      owner,
      now,
    }),
    { action: "send" },
  );

  // hasMeaningfulSummaryContent sanity
  assert.equal(
    hasMeaningfulSummaryContent({ overview: "", decisions: [], actionItems: [], topics: [], openQuestions: [] }),
    false,
  );
  assert.equal(
    hasMeaningfulSummaryContent({ overview: "hi", decisions: [], actionItems: [], topics: [], openQuestions: [] }),
    true,
  );

  console.log("test:summary-email passed (template, escaping, caps, omissions, decision logic)");
}

main();
