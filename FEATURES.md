# Nexa AI — Features & Architecture (Current)

> **Source of truth:** generated from the codebase in `C:\nexa-ai` (read from app routes, modules, DB schema, tRPC routers, auth, and libs).  
> **Last updated:** 2026-11-09  
> This file documents **implemented** features and how they work. Items that are not implemented are listed under [Known limitations & roadmap](#8-known-limitations--roadmap).

---

## Table of Contents

1. [What the app does](#1-what-the-app-does)
2. [Tech stack (as actually used)](#2-tech-stack-as-actually-used)
3. [Database schema](#3-database-schema)
4. [Implemented features — full inventory](#4-implemented-features--full-inventory)
5. [Authentication system — how it works](#5-authentication-system--how-it-works)
6. [Key flows](#6-key-flows)
7. [Project structure](#7-project-structure)
8. [Known limitations & roadmap](#8-known-limitations--roadmap)
9. [Implementation notes / history](#9-implementation-notes--history)

---

## 1. What the app does

**Nexa AI** is a Next.js (App Router) platform that combines **real‑time video meetings** with an **AI voice assistant**.

A signed‑in user can:

- Create custom **AI agents** (name + system instruction).
- **Schedule meetings** and assign an agent to each meeting.
- Join a **video call** (Stream Video) where the user talks to the agent from the call UI.
- Use **push‑to‑talk**: browser speech recognition → `/api/chat` (Mistral, streaming SSE) → browser text‑to‑speech, with conversation history stored per meeting.
- After a call ends, generate a **structured meeting summary** (JSON validated by zod, with a legacy text fallback) from Stream transcript data and/or stored conversation messages.
- Track usage and health from an **analytics dashboard**.
- Manage account/profile/security in **Settings**.
- Submit **feedback** from the dashboard; admins (by `ADMIN_EMAILS`) can review it at `/admin/feedback`.

---

## 2. Tech stack (as actually used)

| Layer | Tech |
|---|---|
| Framework | **Next.js 16.2.6** (App Router), **React 19.2.4**, **TypeScript 5** |
| RPC / data | **tRPC v11** (`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/tanstack-react-query`) with **superjson** transformer; **TanStack React Query v5** |
| Database | **Neon PostgreSQL** (`@neondatabase/serverless`) + **Drizzle ORM 0.45**; migrations via **drizzle-kit** (`db:generate`, `db:migrate`); `db:push` exists for local prototyping only |
| Auth | **Better‑Auth 1.6.11** (email/password, GitHub + Google OAuth, email verification, password reset, email change, account linking) with Drizzle adapter |
| Email | **Brevo** (REST API via `fetch`, no SDK dependency) for transactional emails (verification, password reset, change-email confirmation). Sends are wrapped in `after()`, never throw, and log masked/non-sensitive details; dev-only action-link fallback when not configured or send fails in development |
| Rate limiting | **Upstash** (`@upstash/ratelimit`, `@upstash/redis`) — applied to `/api/chat` (per‑user sliding window) |
| Video / calls | **Stream Video** (`@stream-io/video-react-sdk` client, `@stream-io/node-sdk` server) — call creation, tokens, recordings/transcriptions listing, webhooks |
| LLM / AI | **Mistral API** (`api.mistral.ai`) — model from `MODEL_NAME` (default `mistral-small-latest`). `/api/chat` streams SSE; summaries use JSON mode + zod validation/retry/fallback |
| UI | **shadcn/ui** primitives + **Tailwind CSS v4**, **lucide-react**, **framer-motion**, **sonner** (toasts), **react-markdown** + **remark-gfm** |
| Charts | **apexcharts** + **react-apexcharts** used in dashboard/home components; **recharts** is also installed (and `src/components/ui/chart.tsx` uses Recharts primitives) — chart-library consolidation is not complete |
| Forms / validation | **react-hook-form**, **zod v4** |
| Avatars | **DiceBear** (`@dicebear/core`, `@dicebear/collection`) for generated avatars |
| Routing guard | **`src/proxy.ts`** (Next.js 16 proxy/middleware pattern) — optimistic cookie‑presence redirect only; real auth is server/tRPC |
| Misc | `nanoid`, `date-fns`, `react-icons`, `next-themes`, `cmdk`, `vaul`, `embla-carousel-react`, `tsx` (test scripts) |

**Important:** AI features are implemented against **Mistral only** in the current code (`/api/chat`, summary generation). There is no provider-switching layer.

---

## 3. Database schema

Defined in `src/db/schema.ts` (PostgreSQL). Migrations are committed under `drizzle/` (`0000` baseline, `0001` feedback, `0002` `meetings.summary_data`). Apply with `npm run db:migrate`.

### Better‑Auth tables

| Table | Purpose / notable columns |
|---|---|
| `user` | `id`, `name`, `email` (unique), `emailVerified`, `image`, `bio`, timestamps |
| `session` | `token` (unique), `expiresAt`, `userId` (FK → user, cascade), `ipAddress`, `userAgent` |
| `account` | OAuth/password accounts: `accountId`, `providerId`, `userId`, tokens, `password` |
| `verification` | Verification/reset identifiers: `identifier`, `value`, `expiresAt` |

### Application tables

| Table | Purpose / notable columns |
|---|---|
| `agents` | `id` (nanoid), `name`, `instruction`, `userId` (owner, cascade). Index on `userId` |
| `meetings` | `name`, `userId`, `agentId` (cascade), `instructions`, `status` (enum), `startedAt`, `endedAt`, `transcriptUrl`, `summary` (legacy text overview), `summaryData` (nullable `jsonb`, typed as `StoredMeetingSummary`), `summaryError`, `summarySource`, `recordingUrl`, timestamps. Index on `userId` |
| `activities` | Activity feed: `userId`, `type` (enum), `title`, `description`, `metadata` (text/JSON string). Index on `userId` |
| `conversation_messages` | Per‑meeting chat history: `meetingId` (cascade), `role` (`user` \| `ai`), `content`. Index on `meetingId` |
| `voice_interactions` | Dashboard voice metrics: `userId`, `meetingId`, `duration`, `responseTime` (stored as text). Index on `userId` |
| `feedback` | User feedback: `userId`, `type` (`bug` \| `idea` \| `other`), `message`, `rating` (1–5, nullable), `pageUrl`, `status` (`new` \| `reviewed` \| `resolved`, default `new`). Index on `userId` |

### Enums (as implemented)

- `meetingStatus` = **`scheduled | ongoing | completed`**
- `activityType` = **`meeting_created | meeting_started | meeting_completed | agent_created | agent_updated | agent_deleted | recording_ready | transcription_done`**
- `conversationMessages.role` = **`user | ai`**
- `feedback.type` = **`bug | idea | other`**
- `feedback.status` = **`new | reviewed | resolved`**

### Notes

- Ownership is enforced in queries (`userId` / meeting ownership). Most FKs use `ON DELETE CASCADE`.
- `meetings.summaryData` holds the validated structured summary contract (`src/lib/summary-schema.ts`); `summary` keeps the overview text for compatibility/legacy rendering.
- `agents.getMany/getOne` compute `meetingCount` via SQL join/count.

---

## 4. Implemented features — full inventory

### 4.1 Authentication & account access

Routes/pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`.

- **Email + password** sign‑in/sign‑up (react-hook-form + zod; password min length enforced in UI; Better‑Auth handles hashing/credentials).
- **OAuth** sign‑in with **GitHub** and **Google** (`callbackURL: "/"`).
- **Email verification**: verification emails sent via Better‑Auth + Brevo; `sendOnSignUp` enabled; auto sign‑in after verification configured; sign‑in blocked for unverified users (`requireEmailVerification: true`). `/verify-email` handles verification; sign-up/sign-in/verify-email surfaces include **Resend email** with a 60s cooldown (sessionStorage-persisted) and spam-folder hint. Send failures are logged (masked) while signup/auth flows remain safe.
- **Forgot/reset password**: `/forgot-password` requests reset; reset URL is built to Better‑Auth’s callback (`/api/auth/reset-password/:token` → redirects to `/reset-password` with token/error). `resetPasswordTokenExpiresIn: 3600`, `revokeSessionsOnPasswordReset: true`.
- **Session persistence** via Better‑Auth cookies. Session cookie cache is **disabled** in code (`session.cookieCache.enabled = false`) to avoid oversized cookies (e.g., large avatar data URLs).
- **Sign out** from dashboard user menu and command palette.
- **Legal pages**: `/terms` and `/privacy` exist and auth views link to them (no placeholder `#` links).

### 4.2 AI Agents (`/agents`, `/agents/[agentId]`)

tRPC: `agents.getMany`, `getOne`, `create`, `update`, `remove` (all `protectedProcedure`, owner‑scoped).

- **Create** agent (name + instruction/system prompt).
- **Templates**: five ready-made agent templates (`brainstorm-partner`, `interview-coach`, `language-tutor`, `sales-call-practice`, `standup-buddy`) defined in `src/lib/agent-templates.ts`. The create-agent dialog shows a **“Start from a template”** section above the blank form; **Customize** prefills name and instruction for editing before deploy. Empty states on `/agents` also surface the template grid. The Brainstorm Partner starter template is unchanged and remains the one seeded for new users.
- **List** with pagination + search (name/instruction, case‑insensitive) and live **meeting count**.
- **View** agent details.
- **Edit** name/instruction.
- **Delete** with confirmation (UI).
- **DiceBear avatars** seeded by agent name (GeneratedAvatar usage in UI).
- **Activity feed entries** written for create/update/delete.

### 4.3 Meetings (`/meetings`, `/meetings/[meetingId]`)

tRPC: `meetings.getMany`, `getOne`, `create`, `quickStart`, `update`, `remove`, plus call/summary/message helpers.

- **Schedule** meeting (name, agent, optional instructions; schema supports scheduling fields as implemented).
- **One-click quick start** (`meetings.quickStart`): from any template card, **Try it now** reuses the user’s existing agent whose name exactly matches the template (newest first, instruction left untouched) or creates it from the server-side template, then schedules a meeting named from the template (`status: scheduled`, no meeting-level instructions) and returns `{ meetingId, agentId, reusedAgent }`. The client sends only `templateId`; template text is never accepted from the client. Rate-limited to **10/hour per user** (`quickStart.hour`) and subject to the same agent/meeting quotas as the normal create mutations. The meetings empty state offers a starter-template **Try it now** plus a link to browse templates on `/agents`.
- **List** with pagination, text search, **status filter**, **agent filter** (joins agent name; computes duration in SQL where applicable).
- **Detail view (“Meeting Intelligence”)**: status, timing/duration, agent, instructions, recording/transcript links when present, and summary UI.
- **Structured summary rendering**: when `summaryData` is present/valid, renders sections (overview, decisions, action items, topics, open questions) with **Copy as Markdown** support and fallback/insufficient states. Legacy meetings with only `summary` text still render.
- **Summary polling** behavior while processing (as implemented in the meeting detail UI) and **owner‑scoped retry** via `meetings.retrySummary` (forces regeneration).
- **Cancel/delete** meeting (removal is owner‑scoped).
- **Start/Join** navigates to `/call/[meetingId]`.

### 4.4 Video calls (Stream Video) — `/call/[meetingId]`

- **Stream user token** is issued per meeting via `meetings.getToken({ id })`: ownership checked; token is **call‑scoped** (`generateCallToken` with `call_cids: ["default:<id>"]`, 1h exp).
- **Call provisioning** via `meetings.createCall({ id })`: creates/gets Stream call, sets owner as explicit member/admin, enables recording (`720p`), sets transcription to **`auto-on`** (so Stream starts transcription automatically), logs effective Stream settings, and flips meeting to `ongoing` on first start with activity logging.
- **Call lifecycle UI**: lobby (preview/toggles/join), active call (Stream controls + app layout), ended/completed screen, connection/loading states.
- **Recordings/transcriptions fetch**: `meetings.getRecordings` / `getTranscriptions` (owner‑scoped, proxy to Stream).
- **End call** (`meetings.endCall`): owner‑scoped, idempotent guard for completed meetings, marks completed + `endedAt`, logs activity, best‑effort `stopTranscription()` with safe Stream error diagnostics, best‑effort fetch/store of recording/transcript URLs, then triggers `generateMeetingSummary` inside `after()`.
- **Client stability fix**: call provider avoids recreating the Stream client/call on React Query refetches (stable deps/ref guards) to prevent call restarts during push‑to‑talk.

### 4.5 AI voice assistant (push‑to‑talk)

Key files: `src/hooks/use-voice-assistant.ts`, `src/app/call/ui/components/voice-assistant.tsx`, `/api/chat`.

- **Speech‑to‑Text**: browser `SpeechRecognition` / `webkitSpeechRecognition`.
- **LLM request**: POST `/api/chat` with validated body (`prompt` trimmed 1–2000 chars, `agentId`, `meetingId`). Session required (401 if missing). Agent/meeting ownership and assignment are verified; invalid/foreign IDs return 4xx.
- **System prompt**: agent instruction + meeting instructions (meeting instructions appended as lower‑priority, delimited context).
- **Conversation memory**: loads recent `conversation_messages` for the meeting (bounded history/character budget, per implementation), maps roles for Mistral, and persists user/AI turns (persistence aligned with completed streamed responses as implemented).
- **Streaming**: Mistral called with `stream: true`; `/api/chat` returns **SSE** (`text/event-stream`) with incremental deltas and completion/error events; client renders progressively and supports abort on new request/unmount.
- **TTS**: `speechSynthesis` speaks replies after sanitization (`sanitizeForSpeech` strips markdown/emojis). On leave/end, speech synthesis is cancelled.
- **Metrics**: after exchanges, client logs `voice_interactions` (estimated duration + response time) via `meetings.logVoiceInteraction` (owner‑scoped).

**Note:** The AI uses browser TTS and does **not** join the Stream call as a participant; Stream transcripts capture human participant audio (room echo/mic bleed caveats apply).

### 4.6 Meeting summarization (structured)

Key files: `src/lib/meeting-summary.ts`, `src/lib/summary-schema.ts`, `src/lib/summary-generation.ts`, `src/lib/summary-mistral.ts`, `src/lib/transcript-parser.ts`.

- **Sources**: prefers Stream transcript when `transcriptUrl` is available (and can regenerate when a richer transcript arrives after a fallback), otherwise uses `conversation_messages`; can merge sources. Transcript content capped (e.g., 12,000 chars). Untrusted source is delimited in the prompt.
- **Transcript parsing**: pure parser supports Stream JSONL speech fragments (and other shapes/raw text as implemented), maps known speakers (at minimum owner), and defensively labels AI-like IDs as non-human.
- **Mistral JSON mode** + **zod validation**: requests `response_format: { type: "json_object" }`; retries once on parse/schema failure with validation feedback; on second failure stores a **flagged fallback** (schema-valid, no invented facts). Invalid/unvalidated model output is never stored as structured truth.
- **Guardrails**: prompt resists instruction injection from transcript; post-processing removes decisions that duplicate action items; action-item owners are kept only when evidenced in source text (text match; may return `null`).
- **Short calls**: insufficient-source path stores `meta.kind = "insufficient"` without hallucinating.
- **Persistence**: writes `summaryData` (jsonb) and `summary` (overview text) plus `summarySource`/`summaryError` as applicable.
- **Idempotency & triggers**: generated from Stream webhook handling and from `endCall` (both in `after()` patterns). Owner‑scoped `retrySummary` forces regeneration.
- **Logging**: structured logs use IDs/lengths/timings/statuses; transcript/summary content is not logged.

### 4.7 Stream webhooks — `POST /api/webhooks/stream`

- **Signature verification** over raw/decompressed body (`streamVideo.verifyWebhook` / HMAC behavior aligned with Stream SDK). Verification runs **before** authoritative JSON parsing.
- **Body handling hardening**: reads raw bytes; supports gzip/deflate/br decompression paths as implemented; logs safe diagnostics (`webhook.request`: header names, sizes, encoding, decompression state, signature result, peeked event type — no secrets/content).
- **Robust status handling**: empty probe → 200 ignored; missing signature → 400; invalid signature → 401; signed non‑JSON → 400; signed JSON without `type` → 200 ignored; handled/unhandled signed event types → 200 (prevents unnecessary retries).
- **Events handled** (core): `call.session_started` → meeting `ongoing`; `call.session_ended` → `completed` + summary generation in `after()`; `call.recording_ready` / `call.transcription_ready` → store URLs, log activities (idempotent activity logging by meeting metadata), trigger summary/regeneration as appropriate.
- **Webhook replay script**: `scripts/test-webhook-replay.ts` (`npm run test:webhook-replay`) signs realistic payloads (including gzip cases) against a running dev server.

### 4.8 Dashboard (`/`) — `home` module

tRPC: `home.hello`, `home.getDashboardData`, `home.getSystemHealth` (protected).

- **Greeting + quick stats** (user name from DB).
- **Metrics**: meetings totals/breakdowns/trend, agents total + most used, voice interaction counts/avg response time, recordings/transcriptions counts.
- **Charts**: activity/volume and performance (avg duration) over last 7 days (dashboard UI uses ApexCharts components).
- **Upcoming meetings** and **recent activity feed**.
- **Quick launch** shortcuts (agent/meeting/call actions in UI).
- **AI Insights**: client‑side, rule‑based recommendations derived from metrics (not LLM‑generated).
- **System status monitor**: pings Neon DB (latency) and reports configured/not‑configured status (no external probe calls) for **Brevo** (email, when `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` are set), **Upstash**, and **Sentry** env presence. Polled in UI as implemented.

### 4.9 Dashboard shell & UX

- **Sidebar** navigation (Dashboard, Meetings, AI Agents) + user menu (profile/billing-style entry removed from active billing product flow as applicable; sign out present).
- **Top navbar**: sidebar toggle, status pill, **⌘K / Ctrl+K** search trigger, **Feedback** dialog.
- **Command palette** (`⌘K`): navigation/actions/settings/help shortcuts (billing removed from palette; current entries reflect implemented routes).
- **Feedback dialog**: submits real feedback via `feedback.create` (type, message 5–1000 chars, optional rating 1–5, captures page URL), with loading/success/error toasts.
- **Responsive layout** patterns (drawer/mobile behaviors in UI components).

### 4.10 Settings & Account (`/settings`)

Protected under dashboard layout (and included in proxy protected paths).

- **Profile** tab: update name/bio (`authClient.updateUser`), avatar upload (client validation: max 2 MB, PNG/JPEG/WebP; rejects oversized `data:` URLs; server hook also rejects oversized `data:` images), change email via verification (`authClient.changeEmail`).
- **Security** tab: change password (`authClient.changePassword`, revokes other sessions) with strength UI; sign out.
- **Account** tab: read‑only account details (display name, email, member since, role/owner display).
- **Billing tab is not present** (removed; no payment integration).

### 4.11 Feedback storage & admin review

- **User submission**: `feedback.create` (protected, zod‑validated) stores rows in `feedback`.
- **Admin API**: `feedback.list` and `feedback.updateStatus` are **admin‑only**; non‑admins receive `NOT_FOUND` (to avoid leaking existence). Admins are determined by `ADMIN_EMAILS` (comma‑separated emails).
- **Admin page**: `/admin/feedback` (`(dashboard)/admin/feedback`) performs a server‑side admin check and provides status management UI.

### 4.12 API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...all]` | GET/POST | Better‑Auth handler (`toNextJsHandler`) |
| `/api/trpc/*` | GET/POST | tRPC endpoint (app router: agents, meetings, home, feedback) |
| `/api/chat` | POST | Streaming Mistral chat for voice assistant (auth required, zod validation, per‑user Upstash per-minute + daily limits, meeting/agent ownership checks, SSE response). On limit hit returns **429** with `Retry-After` (seconds) and JSON `{ "error": "rate_limited" \| "daily_limit", "message": string, "retryAfterSeconds": number }` before any Mistral call and before loading history/DB; blocked requests do not call Mistral and do not write conversation/voice-interaction records. |
| `/api/webhooks/stream` | POST | Stream Video webhooks (signature/decompression hardening, meeting status/URLs, summary triggers) |

### 4.13 Scripts & developer tooling

- `npm run dev` / `build` / `start` / `lint`
- DB: `db:generate`, `db:migrate`, `db:push` (prototyping), `db:studio`
- Tests/scripts (tsx): `test:summary`, `test:summary:live`, `test:transcript-parser`, `test:webhook-replay` (replay requires a running dev server), `test:seed-starter-agent`, `test:agent-templates`, `test:limits`
- `scripts/drop_type.mjs` retained for DB maintenance as documented in history

---

## 5. Authentication system — how it works

### 5.1 Server config (`src/lib/auth.ts`)

Better‑Auth is configured with a **Drizzle adapter** over the project schema and:

- **`trustedOrigins`** from env: `BETTER_AUTH_URL` + optional comma‑separated `TRUSTED_ORIGINS` (trimmed/filtered).
- **`emailAndPassword.enabled: true`**, **`requireEmailVerification: true`**, reset token expiry 3600s, **`revokeSessionsOnPasswordReset: true`**. `sendResetPassword` sends via Brevo inside `after()` (non‑blocking, never throws) using a reset URL routed through Better‑Auth’s callback.
- **`emailVerification`**: `sendVerificationEmail` via Brevo in `after()`, **`sendOnSignUp: true`**, **`autoSignInAfterVerification: true`**, `expiresIn: 3600`. `user.changeEmail.sendChangeEmailConfirmation` is wired to Brevo (confirmation sent to the current account email). Email logs contain only template/status/Brevo code/message/messageId/duration/masked recipient; dev-only action links are printed only when `NODE_ENV !== "production"` and send fails or Brevo is not configured.
- **`user.changeEmail.enabled: true`** and **`user.additionalFields.bio`** (string).
- **`account.accountLinking`**: enabled for `google`/`github`. The source contains detailed comments about verification/linking tradeoffs; the active config sets **`requireLocalEmailVerified: true`** and `trustedProviders: ["google","github"]`.
- **`session.cookieCache.enabled: false`** (disabled to prevent 431 from oversized session cookies when avatars were stored as large data URLs). A DB hook rejects oversized `data:` avatar images on user update.
- **`databaseHooks.user.update.before`** rejects `data:` images > 100 KB.

Key env vars (typical): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `BREVO_API_KEY`/`BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME`, `MISTRAL_API_KEY`, `MODEL_NAME`, Stream keys, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_APP_URL`, optional `TRUSTED_ORIGINS`, `DEV_ALLOWED_ORIGINS`, `ADMIN_EMAILS`. Brevo: sender/domain must be verified; free plan is 300 emails/day total.

### 5.2 Auth API mounting

`src/app/api/auth/[...all]/route.ts` exports `{ GET, POST } = toNextJsHandler(auth)`.

### 5.3 Client

`src/lib/auth-client.ts` creates `authClient = createAuthClient({})` (react client) for session hook and auth actions.

### 5.4 Route protection (layered)

1. **`src/proxy.ts` (optimistic)**: checks cookie presence with `getSessionCookie()` (no validation/DB). Protects `/`, `/agents*`, `/meetings*`, `/call*`, `/settings*`; redirects unauthenticated to `/sign-in`; redirects authenticated users away from `/sign-in`/`/sign-up` to `/`.
2. **Server layouts**: dashboard and call layouts perform real `auth.api.getSession()` checks and redirect when missing.
3. **tRPC context** (`src/trpc/init.ts`): resolves `userId` from session; **`protectedProcedure`** throws `UNAUTHORIZED` without `userId`. tRPC uses **superjson**.
4. **Ownership scoping**: procedures filter by `ctx.userId` (and meeting ownership checks where needed). `/api/chat` also enforces session + agent/meeting ownership/assignment. Sensitive fields are minimized in responses (e.g., `meetings.getSession` returns minimal user fields).

---

## 6. Key flows

### 6.1 Agent → meeting → call

1. Sign in (email/password or OAuth; verify email as required).
2. Create agent → `agents.create` (stores instruction, logs activity).
3. Schedule meeting → `meetings.create` (`scheduled`).
4. Start/join → `/call/[meetingId]`: `getToken` (call‑scoped) + `createCall` (Stream call with `transcription.mode = "auto-on"`, owner member) → meeting becomes `ongoing`.
5. In call, push‑to‑talk sends speech → `/api/chat` (SSE, Mistral) → TTS + persisted messages + voice metrics.

### 6.2 End call → summary

1. User leaves/ends call → `meetings.endCall` (or Stream webhook `call.session_ended`).
2. Meeting marked `completed`; recording/transcript URLs may be captured; summary runs in `after()`.
3. Summary loader fetches transcript and/or messages, parser normalizes transcript, Mistral JSON mode generates/validates (retry/fallback/insufficient rules), results saved to `summaryData` + `summary`.
4. Meeting page polls/refreshes and supports **Retry summary** on failure (owner‑scoped).

### 6.3 Webhook → transcript → regeneration

1. Stream sends signed webhook (possibly gzipped). Route verifies, decompresses if needed, parses after verification.
2. `call.transcription_ready` stores `transcriptUrl` and can trigger regeneration when appropriate; `recording_ready` stores recording URL. Activities are logged idempotently.

---

## 7. Project structure

```text
nexa-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # sign-in/up, forgot/reset, verify-email
│   │   ├── (dashboard)/             # protected shell: home, agents, meetings, settings, admin/feedback
│   │   ├── api/
│   │   │   ├── auth/[...all]/       # Better-Auth
│   │   │   ├── trpc/[trpc]/         # tRPC handler
│   │   │   ├── chat/                # Mistral SSE chat (rate-limited)
│   │   │   └── webhooks/stream/     # Stream webhooks
│   │   ├── call/[meetingId]/        # video call room
│   │   ├── terms/, privacy/         # legal pages
│   │   ├── layout.tsx, globals.css
│   ├── components/                  # ui/* (shadcn), generated-avatar, loading/error states
│   ├── db/                          # index.ts, schema.ts
│   ├── hooks/                       # use-voice-assistant, useDashboard, use-mobile, use-debounced-value
│   ├── lib/                         # auth, stream-video, meeting-summary, summary-*, transcript-parser, email, rate-limit, utils
│   ├── modules/                     # feature modules (server procedures + UI)
│   │   ├── agents/
│   │   ├── meetings/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── settings/
│   │   └── feedback/
│   ├── trpc/                        # init, routers/_app, client/server/query-client
│   ├── proxy.ts                     # optimistic route guard
│   └── constants.ts
├── drizzle/                         # migrations + meta (0000, 0001, 0002, ...)
├── scripts/                         # summary/transcript/webhook test scripts, drop_type.mjs
├── drizzle.config.ts
├── next.config.ts                   # allowedDevOrigins from DEV_ALLOWED_ORIGINS
├── package.json
├── README.md
└── FEATURES.md
```

---

## 8. Known limitations & roadmap

1. **Transactional email (Brevo):** free plan is 300 emails/day total; sender/domain must be verified in Brevo. Email sends are logged with masked/non-sensitive details only; a dev-only action-link fallback is printed when `NODE_ENV !== "production"` and Brevo is not configured or a send fails. A global daily email budget (250/day safety margin) is enforced in `sendEmail()` before calling Brevo.
2. **No billing/payments.** Billing UI and plan enforcement are not implemented.
3. **Rate limiting / quotas / caps:** Centralized in `src/lib/limits.ts` and enforced via Upstash-backed limiters (`src/lib/rate-limit.ts`) for `/api/chat` (per-minute + daily), tRPC mutations (`meetings.createCall` hourly+daily, `meetings.getToken`, `meetings.retrySummary` per-user hourly + per-meeting daily, `meetings.logVoiceInteraction`, `feedback.create`), Better-Auth auth endpoint rules (secondary-storage backed by Upstash when configured), global Brevo daily budget, and per-user quotas (max agents/meetings) plus input/text caps and Mistral `max_tokens`/Stream call limits where supported. **Limits fail open** when Upstash is unconfigured or errors at runtime (with structured logs) so the app remains available.
4. **System health is partial.** DB is actively pinged; other services are reported as configured/not configured based on env vars (no live probes). No Sentry SDK integration is evident in runtime code from this scan.
5. **AI Insights are rule-based**, not LLM-generated.
6. **Voice metrics are estimates** (client-side duration/response timing).
7. **No automated test suite/CI in repo** (beyond `tsx` scripts). Several behaviors require manual/browser verification (call UX, webhooks in deployed env, transcript availability).
8. **Transactions not broadly adopted.** Multi-step writes are not wrapped in interactive transactions (noted historically; neon-http constraints apply).
9. **Chart libraries are mixed** (ApexCharts used; Recharts also present). Consolidation deferred.
10. **Stream transcript speaker mapping is limited** (primarily owner mapping today); multi-participant naming needs richer member resolution.
11. **Avatar storage**: large `data:` avatars are blocked; durable fix is object storage for avatar URLs (cookie cache should remain off until avatars are URL-based/small).
12. **Production webhook reliability depends on Stream dashboard config** (URL, events like `call.transcription_ready`, secret alignment) and reachable public endpoint.
13. **Language tutor quality depends on browser speech recognition and text-to-speech language support**; there is no language picker yet.

### Limits (from `src/lib/limits.ts`)

| Area | Limit |
|---|---|
| Chat | 15 requests/minute per user (existing value kept); 300 requests/day per user; Mistral `max_tokens` 250 |
| Create call | 15/hour per user; 40/day per user |
| Get call token | 60/hour per user |
| Retry summary | 5/hour per user; 3/day per meeting (`userId:meetingId`) |
| Feedback create | 5/hour per user |
| Quick start | 10/hour per user (one-click template agent + meeting) |
| Log voice interaction | 120/hour per user |
| Email resend (verification) | 1 per 60 seconds per user/email key; 10/day per user/email key |
| Global Brevo budget | 250 emails/day (UTC day key), checked before Brevo calls |
| Quotas | Max 25 agents per user; max 200 meetings per user (count-then-insert; small race acceptable on neon-http) |
| Text caps | Agent name 80; agent instruction 4000; meeting name 120; meeting instructions 2000; feedback message 5–1000 (unchanged) |
| Stream call | `max_duration_seconds` 3600, `max_participants` 4 (when supported by installed SDK) |

*Notes:* Chat blocked responses return 429 with `Retry-After` and do not call Mistral or write conversation/voice-interaction records. Rate/limit checks fail open when Upstash is down or unconfigured. No schema/migration changes.

---

## 9. Implementation notes / history

This codebase has gone through multiple hardening/fix passes (all reflected in current code where applicable), including:

- Account linking/email verification hardening; ownership scoping across tRPC and `/api/chat`.
- Call authorization: call-scoped Stream tokens and explicit call membership.
- Chat: meeting context passed to LLM, conversation history, SSE streaming, latency instrumentation, abort handling.
- Serverless reliability: `after()` for email/summary work; `summaryError`/retry flow.
- Transcript pipeline: Stream `auto-on` transcription, webhook verification/decompression fixes, JSONL parser, merge/regeneration strategy.
- Structured summaries: `summaryData` jsonb, schema validation, retry-once + flagged fallback, owner sanitization, decision/action-item dedupe guard.
- UX/security fixes: removed fake billing UI, added `/terms` and `/privacy`, protected `/settings` in proxy, superjson transformer, hydration-safe date formatting, oversized session cookie mitigation.
- Feedback: persisted `feedback` table + admin-only review (`/admin/feedback`, `ADMIN_EMAILS`).

*Detailed chronological issue logs previously lived in this file; they were condensed here to keep the document current and maintainable. Use git history and `drizzle/` migrations for deeper provenance.*