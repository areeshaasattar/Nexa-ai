/**
 * Pure parser for Stream call transcription files.
 *
 * Stream uploads transcriptions as JSONL, one speech fragment per line:
 *   {"type":"speech","start_time":"...","stop_time":"...","speaker_id":"user-123","text":"hello"}
 * (see https://getstream.io/video/docs/api/transcribing/calls/ —
 * "Transcription JSONL file format").
 *
 * This file is dependency-free and side-effect-free so the dev script
 * (scripts/test-transcript-parser.ts) and the summary generator can both use
 * it. Transcript content is untrusted input: it is only ever returned as
 * plain text, never interpreted as instructions.
 */

export interface ParsedTranscript {
  /** "Speaker name: text" lines, best-effort ordered by start time. */
  text: string;
  /** Distinct speaker labels as they will appear in the text. */
  speakers: string[];
  /** Number of speech fragments parsed. */
  segments: number;
}

/**
 * speaker_id in the transcript is the Stream user id. These ids may contain
 * underscores/hyphens; a readable fallback replaces them with spaces.
 */
function humanizeSpeakerId(speakerId: string): string {
  return speakerId.replace(/[_-]+/g, " ").trim();
}

/**
 * The AI assistant speaks through browser-side window.speechSynthesis
 * (src/hooks/use-voice-assistant.ts) and never joins the call as a Stream
 * participant, so its TTS should not appear in the transcript at all. This
 * pattern is a defensive catch-all in case a future agent integration
 * publishes audio under an AI-like user id: such speakers are explicitly
 * labelled non-human so the summary never attributes AI speech to a person.
 */
const AI_SPEAKER_ID_PATTERN = /(^|[_-])(ai|agent|assistant|bot|nexa)([_-]|$)/i;

export function isLikelyAiSpeakerId(speakerId: string): boolean {
  return AI_SPEAKER_ID_PATTERN.test(speakerId);
}

function speakerLabel(
  speakerId: string | undefined,
  knownUsers: Record<string, string>,
): string {
  if (!speakerId || !speakerId.trim()) return "Speaker";
  const id = speakerId.trim();
  if (knownUsers[id]) return knownUsers[id];
  const lower = id.toLowerCase();
  // Every non-empty known-user id needs a label; account it only when the
  // user is unresolvable so fragments are still attributable in the text.
  if (isLikelyAiSpeakerId(lower)) return "AI Assistant (non-human)";
  return humanizeSpeakerId(id);
}

interface Segment {
  at: string; // start time for ordering ("" when unknown)
  label: string;
  text: string;
}

function segmentFromRecord(
  obj: Record<string, unknown>,
  knownUsers: Record<string, string>,
): Segment | null {
  const text =
    (typeof obj.text === "string" && obj.text) ||
    (typeof obj.message === "string" && obj.message) ||
    (typeof obj.content === "string" && obj.content) ||
    (typeof obj.value === "string" && obj.value) ||
    "";
  if (!text.trim()) return null;
  const label = speakerLabel(
    (typeof obj.speaker_id === "string" && obj.speaker_id) ||
      (typeof obj.speaker === "string" && obj.speaker) ||
      (typeof obj.user_id === "string" && obj.user_id) ||
      (typeof obj.user === "string" && obj.user) ||
      (typeof obj.participant === "string" && obj.participant) ||
      (typeof obj.name === "string" && obj.name) ||
      undefined,
    knownUsers,
  );
  const at =
    (typeof obj.start_time === "string" && obj.start_time) ||
    (typeof obj.startTime === "string" && obj.startTime) ||
    (typeof obj.start === "string" && obj.start) ||
    "";
  return { at, label, text: text.trim() };
}

function segmentsToText(segments: Segment[]): ParsedTranscript {
  // Stable sort by timestamp keeps the conversation order when start times
  // are present; inputs without them keep their original order.
  const ordered = segments
    .map((segment, index) => ({ segment, index }))
    .sort((a, b) => {
      if (a.segment.at && b.segment.at) {
        const byTime = a.segment.at.localeCompare(b.segment.at);
        if (byTime !== 0) return byTime;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.segment);

  const text = ordered
    .map((segment) => `${segment.label}: ${segment.text}`)
    .join("\n");
  const speakers = [...new Set(ordered.map((segment) => segment.label))];
  return { text, speakers, segments: ordered.length };
}

function collectSegments(
  items: unknown[],
  knownUsers: Record<string, string>,
): Segment[] {
  const segments: Segment[] = [];
  for (const item of items) {
    if (item && typeof item === "object") {
      const parsed = segmentFromRecord(item as Record<string, unknown>, knownUsers);
      // Stream marks non-speech fragments with type != "speech"; keep only
      // speech (or untyped) fragments.
      const type = (item as { type?: unknown }).type;
      if (type !== undefined && type !== "speech") continue;
      if (parsed) segments.push(parsed);
    }
  }
  return segments;
}

/**
 * Parse raw transcript content (JSONL, JSON array/object, or plain text)
 * into speaker-labelled text. Returns null when nothing speech-like was
 * found, so callers can fall back to other summary sources.
 */
export function parseStreamTranscript(
  raw: string,
  knownUsers: Record<string, string> = {},
): ParsedTranscript | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. JSONL: one JSON object per line (the real Stream format).
  if (trimmed.startsWith("{")) {
    const segments: Segment[] = [];
    let allJson = true;
    for (const line of trimmed.split(/\r?\n/)) {
      const candidate = line.trim();
      if (!candidate) continue;
      try {
        const obj = JSON.parse(candidate);
        if (obj && typeof obj === "object") {
          const parsed = segmentFromRecord(
            obj as Record<string, unknown>,
            knownUsers,
          );
          const type = (obj as { type?: unknown }).type;
          if (type === undefined || type === "speech") {
            if (parsed) segments.push(parsed);
          }
        } else {
          allJson = false;
          break;
        }
      } catch {
        allJson = false;
        break;
      }
    }
    if (allJson && segments.length > 0) {
      return segmentsToText(segments);
    }
  }

  // 2. A JSON body: array, or object with a segments-like array.
  try {
    const json: unknown = JSON.parse(trimmed);
    const items = Array.isArray(json)
      ? json
      : Array.isArray((json as { segments?: unknown[] })?.segments)
        ? (json as { segments: unknown[] }).segments
        : Array.isArray((json as { transcript?: unknown[] })?.transcript)
          ? (json as { transcript: unknown[] }).transcript
          : Array.isArray((json as { results?: unknown[] })?.results)
            ? (json as { results: unknown[] }).results
            : [];
    const segments = collectSegments(items, knownUsers);
    if (segments.length > 0) return segmentsToText(segments);
  } catch {
    // Fall through to raw text.
  }

  // 3. Raw text fallback (e.g. SRT/VTT or plain prose).
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/.test(line)); // skip bare SRT counters
  if (lines.length > 0) {
    return { text: lines.join("\n"), speakers: [], segments: 0 };
  }
  return null;
}
