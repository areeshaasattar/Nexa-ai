# Practice Feedback Report Implementation

## Summary

Implemented a scored coaching report feature for interview practice meetings in the nexa-ai Next.js project. The feature extends the existing summary pipeline to generate coaching scores, rubric feedback, and improvement suggestions for meetings where the agent is an "Interview Coach".

## Files Changed

### 1. `src/lib/summary-schema.ts`
**Changes:**
- Added coaching schema types: `coachingRubricKeySchema`, `coachingRubricItemSchema`, `coachingBetterAnswerSchema`, `coachingSchema`
- Extended `summaryDataSchema` with optional `coaching` field
- Added `INTERVIEW_COACHING_PROMPT` constant with interview-specific instructions
- Updated `buildSummaryMessages()` to accept optional `agentName` parameter and select appropriate prompt
- Updated `summaryToMarkdown()` to include coaching content when present

**Schema Structure:**
```typescript
coaching?: {
  overallScore: number (1-10)
  rubric: Array<{
    key: "clarity" | "structure" | "confidence" | "answerQuality"
    score: number (1-10)
    comment: string (max 200 chars)
  }> (exactly 4 items)
  fillerWords: {
    total: number (>= 0)
    examples: string[] (max 5)
  }
  strengths: string[] (max 4)
  improvements: string[] (max 4)
  betterAnswers: Array<{
    question: string
    yourAnswer: string
    suggestedAnswer: string
  }> (max 3)
}
```

### 2. `src/lib/summary-generation.ts`
**Changes:**
- Added `agentName?: string` to `GenerateSummaryOptions` interface
- Updated `generateStructuredSummaryFromSource()` to pass `agentName` to `buildSummaryMessages()`

### 3. `src/lib/meeting-summary.ts`
**Changes:**
- Added `agents` to imports from `@/db/schema`
- Extended meeting data fetch to include `agentId`
- Added query to fetch agent name from agents table
- Passed `agentName` to `generateStructuredSummaryFromSource()`

### 4. `src/modules/meetings/ui/components/coaching-report.tsx` (NEW)
**Purpose:** React component that renders the coaching report UI
**Features:**
- Overall score card with progress bar
- Detailed rubric with 4 criteria (clarity, structure, confidence, answer quality)
- Filler words counter with example chips
- Strengths and improvements in two-column layout (mobile: single column)
- Collapsible "better answer" examples with question, candidate's answer, and suggested answer
- Matches existing neutral white card styling with green accent (#3B6D11)

### 5. `src/modules/meetings/ui/components/structured-summary.tsx`
**Changes:**
- Imported `CoachingReport` component
- Added conditional rendering of `<CoachingReport>` when `summary.coaching` exists
- Coaching report renders ABOVE existing summary sections (overview, decisions, etc.)

### 6. `src/modules/meetings/server/procedures.ts`
**Changes:**
- Updated `getMany` procedure to include `summaryData: meetings.summaryData` in the select clause
- This allows the meetings list to access coaching scores without additional queries

### 7. `src/modules/meetings/ui/views/meetings-view.tsx`
**Changes:**
- Extracted `coachingScore` from `meeting.summaryData?.coaching?.overallScore`
- Added score pill display (e.g., "7/10") next to meeting ID when coaching score exists
- Pill uses green styling consistent with brand colors

### 8. `scripts/test-summary.ts`
**Changes:**
- Added 8 new tests for coaching schema:
  - Valid coaching object acceptance
  - Summaries without coaching field still validate
  - Invalid scores (0, 11) are rejected
  - Wrong rubric count (not exactly 4) is rejected
  - Too many better answers (>3) are rejected
  - Markdown export includes coaching content
  - Interview Coach agent name triggers coaching prompt
  - Other agent names use standard prompt

## Prompt Logic

The system uses two prompt variants:

1. **Standard Meeting Prompt** (default)
   - Used for all non-interview meetings
   - Extracts: overview, decisions, actionItems, topics, openQuestions, sentiment
   - No coaching field

2. **Interview Coaching Prompt** (when `agentName === "Interview Coach"`)
   - Used only for interview practice sessions
   - Extracts: all standard fields PLUS coaching report
   - Coaching is omitted if fewer than 2 candidate answers detected
   - Filler words counted from transcript: um, uh, like, you know, basically, actually

## Validation & Error Handling

1. **Schema Validation**
   - Existing retry-once logic preserved
   - If coaching fails validation twice, summary stored WITHOUT coaching field
   - Invalid scores (outside 1-10 range) are never persisted
   - Rubric must have exactly 4 items with correct keys

2. **Insufficient Source Handling**
   - If transcript too short (fewer than 2 answers), `meta.kind = "insufficient"` and no coaching generated
   - Existing insufficient summary behavior unchanged

3. **Backward Compatibility**
   - `coaching` field is optional, so old summaries (without coaching) still validate
   - No database migration needed (jsonb column already exists)

## UI Behavior

1. **Meeting Detail Page (`/meetings/[meetingId]`)**
   - If `coaching` exists: displays full coaching report above standard summary
   - If no coaching: displays only standard summary (no change from before)
   - Copy as Markdown includes coaching content when present

2. **Meetings List (`/meetings`)**
   - Completed meetings with coaching show small score pill (e.g., "7/10")
   - Pill appears next to meeting ID
   - Non-coaching meetings show no pill

3. **Styling**
   - White cards with `rounded-2xl border border-gray-200/70`
   - Green accent color `#3B6D11` for scores, strengths
   - Amber color for improvements and filler words
   - Responsive: two-column layout on desktop, single column on mobile

## Testing

All tests pass (`npm test`):
- 31 tests in `test-summary.ts` including 8 new coaching-specific tests
- Schema validation tests confirm correct acceptance/rejection
- Prompt selection tests verify Interview Coach agent name triggers coaching prompt
- Markdown export tests verify coaching content inclusion

## Constraints Met

✅ No new dependencies added
✅ No database migration needed (uses existing jsonb column)
✅ Existing summary pipeline extended, not replaced
✅ Old meetings without coaching still render correctly
✅ Invalid scores never stored (validation catches them)
✅ Auth, billing, voice, webhooks, sidebar/header unchanged
✅ TypeScript types updated automatically from Zod schemas
✅ Tests pass: `npm test` succeeds

## Future Considerations

1. **Summary Email**: The existing email logic can optionally include the overall score line when `coaching` exists. No changes made in this implementation.

2. **Template Matching**: Currently matches on agent name "Interview Coach". If template name changes or multiple interview templates are added, consider using `templateId` instead (would require storing templateId in agents table).

3. **Score Thresholds**: UI could add color coding (red <5, yellow 5-7, green 8+) to make scores more visual.

4. **Analytics**: Dashboard could aggregate coaching scores across meetings for trend analysis.
