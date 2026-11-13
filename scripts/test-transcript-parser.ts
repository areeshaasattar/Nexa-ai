/**
 * Dev-only manual test path: run the transcript parser + structured summary
 * against a saved sample transcript file so the pipeline can be tested
 * locally without a public webhook tunnel.
 *
 * Usage:
 *   npx tsx scripts/test-transcript-parser.ts [path/to/transcript.jsonl] [--live]
 *
 * - Without --live, a canned model response validates the local pipeline only
 *   (parser -> schema validation -> summary shape), no API cost.
 * - With --live and MISTRAL_API_KEY set, the real Mistral call runs and the
 *   parsed transcript is summarized exactly like a real meeting.
 * - No database is touched; results are printed to stdout.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStreamTranscript } from "../src/lib/transcript-parser";
import { generateStructuredSummaryFromSource } from "../src/lib/summary-generation";
import {
  MIN_SUMMARY_SOURCE_CHARS,
  type MeetingSummary,
} from "../src/lib/summary-schema";

// Matching hypothetical Stream user ids -> display names, to show how the
// speaker_id mapping works. Real ids resolve through the meetings owner row.
const SAMPLE_KNOWN_USERS: Record<string, string> = {
  "user_sarah": "Sarah Chen",
  "user_marcus": "Marcus Webb",
  "user_priya": "Priya Patel",
};

const SAMPLE_JSONL = [
  '{"type":"speech","start_time":"2026-11-06T09:00:01.000Z","stop_time":"2026-11-06T09:00:04.000Z","speaker_id":"user_sarah","text":"We need to decide on the launch date for Project Atlas."}',
  '{"type":"speech","start_time":"2026-11-06T09:00:05.000Z","stop_time":"2026-11-06T09:00:09.000Z","speaker_id":"user_marcus","text":"I propose we launch on March 14th."}',
  '{"type":"speech","start_time":"2026-11-06T09:00:10.000Z","stop_time":"2026-11-06T09:00:14.000Z","speaker_id":"user_sarah","text":"Agreed, launch on March 14th. Marcus, please prepare the pricing page by Monday."}',
  '{"type":"speech","start_time":"2026-11-06T09:00:15.000Z","stop_time":"2026-11-06T09:00:19.000Z","speaker_id":"user_priya","text":"I will do the legal review before the beta starts."}',
  '{"type":"non_speech","start_time":"2026-11-06T09:00:20.000Z","stop_time":"2026-11-06T09:00:21.000Z","speaker_id":"user_priya","text":"should not appear"}',
].join("\n");

const CANNED_SUMMARY: MeetingSummary = {
  overview:
    "The team agreed to launch Project Atlas on March 14th; Priya will handle the legal review and Marcus the pricing page.",
  decisions: ["Launch Project Atlas on March 14th."],
  actionItems: [
    { task: "Prepare the pricing page.", owner: "Marcus", dueDate: "Monday" },
    { task: "Do the legal review.", owner: "Priya", dueDate: null },
  ],
  topics: ["Project Atlas launch"],
  openQuestions: [],
};

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const filePath = args.find((a) => !a.startsWith("--"));

  let raw: string;
  if (filePath) {
    raw = readFileSync(filePath, "utf8");
    console.log(`Parsing saved transcript file: ${filePath} (${raw.length} chars)`);
  } else {
    raw = SAMPLE_JSONL;
    console.log("No file given; using the built-in Stream JSONL sample.");
  }

  // 1. Parse.
  const parsed = parseStreamTranscript(raw, SAMPLE_KNOWN_USERS);
  if (!parsed) {
    console.error("FAIL: parseStreamTranscript returned null (no speech fragments found).");
    process.exitCode = 1;
    return;
  }
  console.log(
    JSON.stringify({
      parserResult: {
        segments: parsed.segments,
        speakers: parsed.speakers,
        chars: parsed.text.length,
      },
    }),
  );

  // 2. Shape assertions on the parsed transcript (built-in sample only).
  if (!filePath) {
    assert.equal(parsed.segments, 4, "non-speech fragments must be dropped");
    assert.ok(parsed.text.includes("Sarah Chen:"), "speaker_id must map to display name");
    assert.ok(!parsed.text.includes("user_sarah:"), "raw Stream user id must not label lines");
    assert.ok(!parsed.text.includes("should not appear"), "non-speech fragments must be dropped");
    console.log("PASS parser shape checks (4 segments, mapped speakers, non-speech dropped)");
  }

  // 3. Summary. --live uses the real Mistral call; otherwise a canned valid
  //    response exercises validation + summary kind without any API usage.
  if (parsed.text.trim().length < MIN_SUMMARY_SOURCE_CHARS) {
    console.log(
      `Source is below the ${MIN_SUMMARY_SOURCE_CHARS}-char minimum; a real meeting would store the "insufficient" state. Skipping summary generation.`,
    );
    return;
  }

  if (live && process.env.MISTRAL_API_KEY) {
    const { createMistralSummaryCaller } = await import("../src/lib/summary-mistral");
    const callModel = createMistralSummaryCaller({
      meetingId: "local-transcript-test",
      model: process.env.MODEL_NAME || "mistral-small-latest",
      apiKey: process.env.MISTRAL_API_KEY,
    });
    const result = await generateStructuredSummaryFromSource({
      source: parsed.text,
      callModel,
    });
    assert.equal(result.status, "ok");
    assert.ok(result.data);
    console.log(
      JSON.stringify(
        {
          kind: result.data.meta?.kind,
          attempts: result.attempts,
          providerAttempts: result.providerAttempts,
          usedFallback: result.usedFallback,
          summary: result.data,
        },
        null,
        2,
      ),
    );
  } else {
    const result = await generateStructuredSummaryFromSource({
      source: parsed.text,
      callModel: async () => JSON.stringify(CANNED_SUMMARY),
    });
    assert.equal(result.status, "ok");
    assert.ok(result.data);
    assert.equal(result.data.meta?.kind, "structured");
    assert.equal(result.data.decisions.length, 1);
    assert.equal(result.data.actionItems.length, 2);
    console.log(
      JSON.stringify(
        {
          kind: result.data.meta?.kind,
          attempts: result.attempts,
          providerAttempts: result.providerAttempts,
          usedFallback: result.usedFallback,
          summary: result.data,
        },
        null,
        2,
      ),
    );
    console.log("PASS canned-model pipeline (parser -> validation -> structured summary)");
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
