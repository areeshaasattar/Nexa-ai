# Nexa AI — Implemented Features & Authentication Deep-Dive

> This document is a complete inventory of the features currently implemented in this project
> (as read from the codebase), followed by a detailed explanation of how the authentication
> system works end‑to‑end.

---

## Table of Contents

1. [What the app does](#1-what-the-app-does)
2. [Tech stack (as actually used)](#2-tech-stack-as-actually-used)
3. [Database schema](#3-database-schema)
4. [Implemented features — full inventory](#4-implemented-features--full-inventory)
5. [Authentication system — how it works](#5-authentication-system--how-it-works)
6. [Key flows](#6-key-flows)
7. [Project structure](#7-project-structure)
8. [Notes & discrepancies found while reading the code](#8-notes--discrepancies-found-while-reading-the-code)

---

## 1. What the app does

**Nexa AI** is a Next.js platform that combines **real‑time video conferencing** with an **AI voice
assistant**. A user can:

- Create custom **AI agents** (a name + a system instruction).
- **Schedule meetings** and assign an agent to each meeting.
- Join a **video call** (powered by Stream Video) where the agent behaves like a live AI
  co‑participant.
- **Talk to the agent** (push‑to‑talk): browser speech recognition → LLM (Mistral) → text‑to‑speech
  response, all rendered in a sidebar next to the video.
- After a call ends, the conversation is **auto‑summarized** by the LLM and stored on the meeting.
- View everything from a rich **analytics dashboard** (metrics, charts, activity feed, system health).

---

## 2. Tech stack (as actually used)

| Layer        | Tech                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Framework    | **Next.js 16.2.6** (App Router, React 19.2.4, TypeScript 5)                                                         |
| RPC layer    | **tRPC v11** (`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/tanstack-react-query`) — no data transformer configured; JSON-RPC over HTTP batch links (A `superjson` transformer is planned but not wired up — the package is installed but unused)  |
| Data fetching| **TanStack React Query v5** (server + client)                                                                        |
| Database     | **Neon (PostgreSQL, serverless)** via `@neondatabase/serverless` + **Drizzle ORM 0.45** + drizzle‑kit migrations     |
| Auth         | **Better‑Auth 1.6.11** (email/password + GitHub & Google OAuth, email verification, password reset, email‑change, account linking; Drizzle adapter) |
| Email        | **Resend** (`resend` 6.x) — transactional mail (sign‑up verification, password reset) with a graceful no‑key fallback |
| Rate limiting| **Upstash** (`@upstash/ratelimit` + `@upstash/redis`) — per‑user sliding window on `/api/chat`, analytics enabled     |
| Video        | **Stream Video** (`@stream-io/video-react-sdk` 1.37 client, `@stream-io/node-sdk` 0.7 server)                        |
| LLM / AI     | **Mistral** (`api.mistral.ai`), model from `MODEL_NAME` env (default `mistral-small-latest`)                         |
| UI           | **shadcn/ui** + **Tailwind CSS v4**, **lucide-react**, **framer-motion**, **recharts** & **apexcharts**, **vaul**, **sonner** (toasts) |
| Forms        | **react-hook-form** + **zod** v4                                                                                     |
| Avatars      | **DiceBear** (`@dicebear/core` + `@dicebear/collection` — `lorelei`, `bottts`, `initials` styles)                    |
| Routing      | **Next.js 16 `proxy.ts`** (renamed middleware) — optimistic cookie‑presence guard for the `(dashboard)` group          |
| Misc         | `nanoid` (IDs), `date-fns`, `react-icons`, `next-themes`, `clsx`/`tailwind-merge`, `cmdk`                             |

> **Note:** all documentation (README, `AI_SETUP.md`, this file) describes the Mistral backend:
> `/api/chat` and `meeting-summary.ts` only call **Mistral** (`api.mistral.ai`,
> `MISTRAL_API_KEY` + optional `MODEL_NAME`, default `mistral-small-latest`). There is no
> OpenRouter/Gemini/Groq provider switching in the code.

---

## 3. Database schema

Defined in `src/db/schema.ts` (PostgreSQL dialect). Migrations are committed in `drizzle/`
and applied with `npm run db:migrate`; `npm run db:generate` creates a new migration from
schema changes. `db:push` remains a local-prototyping script only.

### Better‑Auth tables (managed by the auth adapter)

| Table        | Purpose / notable columns                                                                 |
| ------------ | ----------------------------------------------------------------------------------------- |
| `user`       | `id`, `name`, `email` (unique), `emailVerified`, `image`, `bio`, `createdAt`, `updatedAt`  |
| `session`    | `token` (unique), `expiresAt`, `userId` (FK → user, cascade), `ipAddress`, `userAgent`      |
| `account`    | OAuth + password accounts: `accountId`, `providerId`, `userId`, tokens, `password` (hashed) |
| `verification| One‑time verification codes/links: `identifier`, `value`, `expiresAt`                     |

### App tables

| Table                | Purpose / notable columns                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `agents`             | AI agent definitions: `name`, `instruction` (system prompt), `userId` (owner, FK cascade)                        |
| `meetings`           | Scheduled calls: `name`, `userId`, `agentId` (FK → agents), `instructions`, `status`, `startedAt`, `endedAt`, `transcriptUrl`, `summary` (overview text, kept for compatibility), `summaryData` (nullable `jsonb` structured summary), `summaryError`, `summarySource`, `recordingUrl` |
| `activities`         | Activity feed: `userId`, `type` (enum below), `title`, `description`, `metadata` (JSON string)                   |
| `conversation_messages` | Chat history per meeting: `meetingId` (FK cascade), `role` (`user`/`ai`), `content`                            |
| `voice_interactions` | Dashboard metrics per voice exchange: `meetingId`, `duration`, `responseTime`                        |
| `feedback`           | User feedback: `id`, `userId` (FK -> user, cascade, indexed), `type` (bug/idea/other), `message`, `rating` (1-5, nullable), `pageUrl`, `status` (new/reviewed/resolved), `createdAt` |

`meetings.summaryData` is validated by `src/lib/summary-schema.ts`:
`{ overview, decisions[], actionItems[{ task, owner, dueDate }], topics[], openQuestions[], meta? }`.
`meta.kind` is `structured`, `fallback`, or `insufficient`. Rows written before this
column existed have `summaryData = null` and still render their text `summary`.

**Enums:**

- `meetingStatus` = `scheduled | ongoing | completed | failed | cancelled | processing`
- `activityType` = `meeting_created | meeting_started | meeting_completed | agent_created | agent_updated | agent_deleted | recording_ready | transcription_done`

**Indexes:** created on every `userId` FK, plus `meetingId` for messages and `identifier` for
verification. All FK relations use `onDelete: cascade` (deleting a user/agent/meeting removes
dependent rows).

---

## 4. Implemented features — full inventory

### 4.1 Authentication (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`)
- Email + password sign‑in and sign‑up (password hashed by Better‑Auth, min 8 chars, confirm‑password validation).
- GitHub & Google **OAuth** social login.
- Session persistence via cookies; server‑side session checks on protected pages.
- Sign‑out from the user menu and command palette.
- **Forgot / reset password** — `/forgot-password` requests a reset link (`authClient.requestPasswordReset`, 1‑hour single‑use token via Resend); `/reset-password` validates the token (Better‑Auth callback) and sets the new password (`authClient.resetPassword`), revoking all other sessions.
- **Email verification** — `sendOnSignUp` emails a verification link (1‑hour expiry); sign‑in is blocked for unverified users (403) and the sign‑in view offers a resend; `/verify-email` handles the link, shows an expired‑token state with a resend form, and auto‑signs‑in after success.
- **Email & password change** — available on the `/settings` page (see §4.13).

### 4.2 AI Agents module (`/agents`, `/agents/[agentId]`)
- **Create** an agent (name + instruction) → `agents.create`.
- **List** agents with server‑side **pagination + search** (by name or instruction, case‑insensitive) → `agents.getMany`. Each row includes a live `meetingCount` (aggregated via SQL join).
- **View** a single agent with details (ID, instructions, meeting count, created date) → `agents.getOne`.
- **Edit** an agent (rename / change instructions) → `agents.update`.
- **Delete** an agent with a confirmation dialog → `agents.remove`.
- Each agent gets a unique **DiceBear generated avatar** (seeded by name, `bottts` style).
- Actions are **scoped to the authenticated user** (every query filters by `ctx.userId`).
- Creating/updating/deleting an agent writes an entry to the **activity feed**.

### 4.3 Meetings module (`/meetings`, `/meetings/[meetingId]`)
- **Schedule** a meeting (name, assigned agent, optional instructions, optional start/end datetimes) → `meetings.create`.
- **List** meetings with pagination, **text search**, **status filter**, and **agent filter** → `meetings.getMany` (joins agent name, computes duration in SQL).
- **View** a meeting detail page ("Meeting Intelligence") showing status badge, date/start time, assigned agent, duration, mission instructions, and — once available — **recording link**, **raw transcript link**, and the **AI‑generated summary**. Structured summaries render as Overview, Key decisions, Action items (checklist with owner badges and optional due dates), Topics (chips) and Open questions, plus a **Copy as Markdown** button. Older text-only summaries keep their original prose rendering. The page **auto‑polls every 5 s** while status is `completed` but the summary hasn't arrived yet, and offers a retry when generation failed.
- **Cancel / delete** a meeting (with confirm).
- **Start / Join** a meeting → navigates to the call room (`/call/[meetingId]`).
- All actions are **owner‑scoped**.

### 4.4 Video calls (Stream Video) — `/call/[meetingId]`
- **Automatic Stream user token generation** (1‑h expiry) → `meetings.getToken`.
- **Call provisioning** on demand via `streamVideo.video.call("default", meetingId).getOrCreate()`, with recording (`720p`) and transcription enabled → `meetings.createCall`. Meeting status flips `scheduled → ongoing` with `startedAt`.
- Full call lifecycle UI driven by Stream's `CallingState`:
  - **Lobby** — camera/mic preview, toggle mic & camera, "Join" button.
  - **Active call** — side‑by‑side layout: user video tile + animated **AI agent tile** (avatar, speaking/listening state, waveform), plus Stream `CallControls` (mute, camera, leave).
  - **Ended** — "Mission Completed" screen with links back to the app.
- **Call connect / loading overlay** ("Establishing secure connection…") while the client initializes.

### 4.5 AI voice assistant (the core feature)
Lives in the call sidebar (`src/app/call/ui/components/voice-assistant.tsx`), driven by
`src/hooks/use-voice-assistant.ts`:

1. **Push‑to‑Talk** — user clicks the mic button.
2. **Speech‑to‑Text** — browser native `SpeechRecognition` / `webkitSpeechRecognition` (no server round‑trip for audio).
3. **LLM call** — transcript is POSTed to `/api/chat` with the selected `agentId`; the agent's `instruction` is used as the **system prompt** to Mistral (`MODEL_NAME`, default `mistral-small-latest`).
4. **Text‑to‑Speech** — the LLM reply is spoken with `speechSynthesis`, after a `sanitizeForSpeech()` pass that strips markdown symbols and emojis so they aren't read aloud.
5. **Conversation history** rendered in the sidebar (user vs. AI bubbles, typing indicator, "Listening…" indicator, auto‑scroll).
6. **Persistence** — each message is saved to `conversation_messages` (fire‑and‑forget `saveMessage`), and a `voice_interactions` row (duration estimate, response time) is logged after each exchange for dashboard metrics.

### 4.6 Meeting summarization
- `src/lib/meeting-summary.ts` fetches the **Stream transcript** when `transcriptUrl` is present
  (capped at 12,000 chars, existing rule), otherwise falls back to `conversation_messages`, and
  merges both when available. The source is wrapped in explicit untrusted-data delimiters.
- **Mistral JSON mode** — requests `response_format: { type: "json_object" }` and validates the
  reply with the zod schema in `src/lib/summary-schema.ts`. JSON mode guarantees syntax only, so
  invalid JSON or schema violations trigger **one retry** with the validation error described to
  the model. A second failure persists a schema-valid overview-only fallback flagged
  `meta.kind = "fallback"`; unvalidated model output is never stored.
- **No hallucinated people** — action-item owners are kept only when the name appears in the
  source text; otherwise `owner` is stored as `null`.
- **Short calls** — sources under 200 non-whitespace chars skip the model and store
  `meta.kind = "insufficient"` ("Not enough conversation to summarize").
- Result is stored twice for compatibility: `meetings.summaryData` (jsonb, structured) and
  `meetings.summary` (the overview text, so older UI/tests keep working).
- **Idempotent** — skips if a summary already exists (unless a richer transcript has since
  arrived), safe to be triggered from both the Stream webhook and the client `endCall`.
  The owner-scoped `retrySummary` mutation forces regeneration in the new format.
- Triggered by: (a) Stream `call.session_ended` webhook inside `after()`, and (b) the client
  `meetings.endCall` mutation (a reliable fallback when the webhook can't reach localhost during
  dev), also inside `after()` with a failure/retry state.
- Logging emits JSON events with meeting ids, source lengths, attempt counts and timings only —
  never transcript or summary content.

### 4.7 Stream webhook handling (`/api/webhooks/stream`)
- Verifies the **HMAC‑SHA256 signature** (`x-signature` header) against the Stream secret via `streamVideo.verifyWebhook()`.
- `call.session_started` → meeting `status = ongoing`, `startedAt = now`.
- `call.session_ended` → meeting `status = completed`, `endedAt = now` + summary generation inside `after()`.
- Gracefully returns 200/"ignored" for unknown/empty payloads.

### 4.8 Dashboard (`/`, `src/modules/home`)
Powered by `homeRouter.getDashboardData` (one aggregated query) + `homeRouter.hello` + `homeRouter.getSystemHealth`, fetched by the `useDashboard` hook with polling:
- **Hero section** — time‑of‑day greeting with the user's first name + 4 quick stats.
- **Metric cards** — Total Meetings, Active AI Agents, Voice Interactions, Recordings (counts + per-card sparkline where available; trend arrow on Total Meetings).
- **Intelligence Hub chart** — tabbed *Activity* (meeting volume, last 7 days, area chart) and *Performance* (avg meeting duration, line chart). Uses `recharts`.
- **Upcoming schedule** — list of scheduled meetings with agent, date & status.
- **Quick launch** — New Agent / Schedule / Instant Call shortcut cards.
- **AI Insights** — client-side, rule-based recommendations derived from metrics (e.g. "Meeting volume up X% this week", most active agent, transcription count). Not LLM-generated.
- **System status monitor** — live check of the Neon database (real ping + latency); only the database is probed. Polled every 30 s.
- **Recent activity timeline** — last 10 activity entries.

### 4.9 Dashboard shell & UX
- **Sidebar** (green‑950 theme) with Dashboard / Meetings / AI Agents navigation, logo, and a footer **user menu** (avatar, name; menu items: My Profile, Billing & Plan, Security, Account Settings, Sign Out).
- **Top navbar** — sidebar toggle, "System Online" pill, **⌘K search bar** (opens command palette), and a **Feedback** dialog (sonner toast on submit).
- **Command palette (`⌘K`)** — keyboard‑driven launcher with *Navigate* (Dashboard, Meetings, AI Agents), *Actions* (New Meeting), *Settings* (Profile, Billing, Security, Account Settings), and *Help* (Documentation, Sign Out). Also opens via the search box click (custom `open-shortcuts` event).
- Mobile‑responsive (sidebar drawer, mobile search button, collapsible panels).

### 4.10 Data & list features
- **URL‑driven filtering** (`useAgentsFilter` / `useMeetingsFilter`) — search, status, agent, page, pageSize live in the query string; pagination controls push new params without a scroll jump.
- **Server‑side pagination** (default page 1, size 10; max 100) with total‑page counts returned by tRPC.
- Reusable `DataTable` (TanStack Table) + `DataPagination` components.

### 4.11 Shared infrastructure
- **Reusable UI component library** — 50+ shadcn/ui primitives in `src/components/ui/` (button, dialog, dropdown, table, card, tabs, sheet, sidebar, alert‑dialog, avatar, etc.).
- **GeneratedAvatar** component — renders a real image if provided, otherwise a DiceBear SVG, else initials fallback.
- **Loading & error states** (`loading-state.tsx`, `error-state.tsx`) used across every list/detail page.
- **Toasts** via `sonner` throughout.
- **Health endpoint** (`homeRouter.getSystemHealth`) returning per‑service status/latency.

### 4.12 API surface (routes)
| Route                    | Method | Purpose                                                                 |
| ------------------------ | ------ | ----------------------------------------------------------------------- |
| `/api/auth/[...all]`     | GET/POST | All Better‑Auth endpoints (sign‑in/up, OAuth, session, sign‑out, etc.) |
| `/api/trpc/*`            | GET/POST | All tRPC procedures (agents, meetings, dashboard).                     |
| `/api/chat`              | POST   | Sends `{ prompt, agentId }` to Mistral using the agent's instruction as system prompt. |
| `/api/webhooks/stream`   | POST   | Verifies signature, updates meeting status, triggers summarization.    |

### 4.13 Settings & Account (`/settings`)
Tabs: **Profile**, **Billing**, **Security**, **Account**.
- **Profile** — edit display name + bio (`authClient.updateUser`), avatar upload, and change email via a verification link (`authClient.changeEmail`); shows verified/unverified badge.
- **Billing** — UI-only "Pro Plan / Active" card; management not yet implemented ("coming soon").
- **Security** — change password (`authClient.changePassword`, `revokeOtherSessions: true`) with a client-side strength meter; sign out.
- **Account** — read-only display name, email, member-since date, role ("Owner").

---

## 5. Authentication system — how it works

Authentication uses **Better‑Auth v1.6** with the **Drizzle adapter** backed by the Neon Postgres
`user`/`session`/`account`/`verification` tables. Below is the complete picture.

### 5.1 Server‑side setup — `src/lib/auth.ts`

```ts
// Built entirely from env — no literal domains in code
const trustedOrigins = [
  process.env.BETTER_AUTH_URL ?? "",
  ...(process.env.TRUSTED_ORIGINS ?? "").split(","),
]
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const auth = betterAuth({
  trustedOrigins,
  socialProviders: {
    github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET },
    google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      requireLocalEmailVerified: true,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => { /* fire-and-forget via Resend */ },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
  },
  user: {
    changeEmail: { enabled: true },
    additionalFields: { bio: { type: "string", defaultValue: "" } },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => { /* fire-and-forget via Resend */ },
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
  },
  database: drizzleAdapter(db, { provider: "pg", schema: { ...schema } }),
});
```

Key points:
- **`emailAndPassword`**: enabled, `requireEmailVerification: true` (sign-in blocked until verified), reset token expires in 1 h, `revokeSessionsOnPasswordReset: true`.
- **`emailVerification`**: `sendOnSignUp: true`, `autoSignInAfterVerification: true`, 1‑hour expiry; verification email sent fire-and-forget via Resend.
- **`user.changeEmail`**: enabled (verification-gated).
- **`account.accountLinking`**: enabled for Google/GitHub with `requireLocalEmailVerified: true` (Better-Auth 1.6.11 does not enforce this flag at runtime; effective mitigation relies on `requireEmailVerification: true` - see Issue 1 note).
- **`trustedOrigins`** → built from env only: `BETTER_AUTH_URL` plus optional comma-separated `TRUSTED_ORIGINS`.
- **Drizzle adapter** → sessions/accounts persisted in the Drizzle schema tables.
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, plus `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`/`RESEND_FROM_EMAIL` (optional), `MISTRAL_API_KEY`.

### 5.2 Exposing the API — `src/app/api/auth/[...all]/route.ts`

```ts
import { toNextJsHandler } from "better-auth/next-js";
export const { POST, GET } = toNextJsHandler(auth);
```

This mounts **all** Better‑Auth HTTP endpoints under `/api/auth/*` (e.g.
`POST /api/auth/sign-in/email`, `POST /api/auth/sign-up/email`, `GET /api/auth/get-session`,
`POST /api/auth/sign-out`, `POST /api/auth/sign-in/social`). The handler reads/writes the auth
cookie (a session token) via the standard Better‑Auth cookie mechanism.

### 5.3 Client‑side setup — `src/lib/auth-client.ts`

```ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({});
```

A bare client (no extra plugins). It automatically:
- Reads/writes the auth cookie in the browser.
- Exposes `authClient.useSession()` (React hook — used by `DashboardUserButton` and the agent dialog).
- Exposes `signIn.email`, `signUp.email`, `signIn.social`, `signOut`, `getSession`, etc.

### 5.4 Login / Sign‑up flows (`src/modules/auth/ui/views/*`)

Both views use **react‑hook-form + zod** validation and call the auth client:

- **`signIn.email({ email, password, callbackURL: "/" })`** → on success, `router.push("/")` + success toast.
- **`signUp.email({ email, password, name, callbackURL: "/" })`** → creates the account, signs the user in, redirects to `/`.
  - Client‑side rules: name ≥ 2 chars, valid email, password ≥ 8 chars, password === confirm.
- **`signIn.social({ provider: "google" | "github", callbackURL: "/" })`** → redirects to the provider's OAuth consent, then back to the app with an authenticated cookie.
- Error handling via `onError` callbacks → `sonner` toasts ("Authentication Failed", "GitHub Error", etc.).
- **Forgot password / reset password** — fully implemented: the "Forgot password?" link goes to
  `/forgot-password` (`authClient.requestPasswordReset`), which emails a 1‑hour single‑use reset
  link via Resend; the token is validated by Better‑Auth and redirects to `/reset-password`
  (`authClient.resetPassword`) where the new password is set (all other sessions are revoked).
- **Email verification** — `sendOnSignUp` emails a verification link (`emailVerification`, 1‑hour
  expiry); sign‑in is blocked for unverified users (403) and the sign‑in view detects this and
  offers a resend; `/verify-email` handles the link, shows an expired‑token state with a resend
  form, and auto‑signs‑in after successful verification.
- **Email & password change** — the `/settings` page lets users change their email
  (`authClient.changeEmail`, confirmed via a verification email) and password
  (`authClient.changePassword`).
- Terms/Privacy links remain UI placeholders.

### 5.5 Session checks & route protection

Four layers protect the app:

1. **Proxy (`src/proxy.ts`, Next.js 16 renamed middleware)** — optimistic cookie-presence guard. `getSessionCookie()` only checks that a `better-auth.session_token` cookie exists (no DB round-trip, no validation). Protected paths: `/`, `/agents` (and subpaths), `/meetings` (and subpaths), `/call` (and subpaths) → redirect to `/sign-in` when no cookie. Auth pages (`/sign-in`, `/sign-up`) redirect to `/` when a cookie exists. Matcher excludes `/api/*`, `/_next/*`, and static files. Real protection does NOT come from this layer.

2. **Server-side layouts** — `(dashboard)/layout.tsx` and `call/layout.tsx` both call `auth.api.getSession({ headers })` and `redirect("/sign-in")` when there is no session. This covers every page under those route groups, including `/settings`, `/agents`, `/meetings`, and `/call/[meetingId]`.

3. **tRPC context** — `src/trpc/init.ts`:
   ```ts
   export const createTRPCContext = cache(async () => {
     const session = await auth.api.getSession({ headers: await headers() });
     return { userId: session?.user.id };
   });
   ```
   The `userId` is threaded into every tRPC call. The **`protectedProcedure`** middleware throws `TRPCError UNAUTHORIZED` when there's no `userId`, so every agents/meetings/dashboard procedure is gated.

4. **Ownership scoping** — even when authenticated, every query/mutation filters on `eq(<table>.userId, ctx.userId)`, so users can only see/modify their own data. `/api/chat` now also scopes the agent lookup by `userId`.

### 5.6 Sessions inside the app

- `meetings.getSession` procedure returns the raw Better‑Auth session (used by the call provider to
  build the Stream video client identity).
- `authClient.useSession()` (React) is used client‑side for the user menu, avatar, and the
  "session is loading" skeleton states.
- `DashboardUserButton` and the `⌘K` palette both call `authClient.signOut(...)` then push to
  `/sign-in`.

### 5.7 How a request is authenticated (summary)

1. Browser sends the Better‑Auth session cookie with every request.
2. `toNextJsHandler` (API route) / `auth.api.getSession({ headers })` (server code / tRPC context)
   reads that cookie, looks up the `session` row (validating `expiresAt`), and returns the user.
3. Server pages redirect if no session; tRPC `protectedProcedure` throws `UNAUTHORIZED` if no
   `userId`; all data queries additionally filter by the authenticated `userId`.

---

## 5.8 Security notes (owner-scoping & input validation)

- All tRPC procedures (`agents.*`, `meetings.*`, `home.*`) are `protectedProcedure`-gated and filter
  every query/mutation by `ctx.userId`; `meetings.saveMessage`, `logVoiceInteraction`,
  `getRecordings`, `getTranscriptions`, and `endCall` verify meeting ownership before acting.
- `/api/chat` validates its body with zod (prompt: trimmed, 1–2000 chars; agentId: 1–64 chars),
  returns 400 on invalid input, checks the session (401 when absent), and scopes the agent lookup
  to the caller (`agents.id` + `agents.userId`). It is rate-limited per user via Upstash.
- `meetings.getSession` returns only minimal user fields (`id`, `name`, `email`, `image`) — no
  session token or other sensitive fields.

## 6. Key flows

### 6.1 Create an agent → schedule a meeting → run a call
1. Sign in (email/password or OAuth).
2. **Agents → New Agent** → name + instruction → `agents.create` (stores system prompt, logs activity).
3. **Meetings → New Meeting** → name, pick agent, optional instructions → `meetings.create` (status `scheduled`, logs activity).
4. **Start Meeting** on the meeting detail page → `/call/[meetingId]`.
5. `StreamCallProvider` → `meetings.getToken` (Stream JWT) + `meetings.getOne` + `meetings.createCall` → Stream call created (`recording: 720p`, `transcription: available`); meeting becomes `ongoing`.
6. In the call: user presses **Push to Talk** → SpeechRecognition → `/api/chat` (Mistral, agent instruction as system prompt) → reply spoken + saved to `conversation_messages` + logged to `voice_interactions`.

### 6.2 End a call → structured summary generated
- User clicks **Leave** in `CallControls` → `window.speechSynthesis.cancel()` → `endCall` mutation:
  - Marks meeting `completed`, sets `endedAt`, logs `meeting_completed` activity.
  - Fetches recording/transcription URLs from Stream (best‑effort, non‑blocking).
  - Runs `generateMeetingSummary(id)` inside Next.js `after()` so `endCall` never blocks on it.
- Alternatively (or additionally) the **Stream webhook** `call.session_ended` performs the same
  status update and triggers summary generation inside `after()`. Both are **idempotent**, so the
  first one to run wins; if a transcript arrives later, the conversation-only summary may be
  regenerated from the richer source.
- Generation fetches the transcript (or `conversation_messages` fallback), asks Mistral in JSON
  mode, validates with zod, retries once on invalid output, and then persists either structured
  data, a flagged fallback, or the `insufficient` state. `summary` is filled with the overview.
- The meeting detail page polls every 5 s while status is `completed` but `summary` is missing,
  stopping after ~2 min. Failures show `summaryError` with an owner-scoped **Retry summary**
  button, which forces a fresh structured generation in the new format.

### 6.3 Voice interaction metrics
- After each user→AI exchange, the client estimates response time (`performance.now()`) and a
  speaking duration (word count ÷ 2.5 wps) and calls `logVoiceInteraction`.
- `voice_interactions` rows feed the dashboard's **Voice Interactions** metric (count + average
  response time). Duration is estimated client-side (word count ÷ 2.5 wps); response time from
  `performance.now()`.

---

## 7. Project structure

```
nexa-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # sign-in / sign-up pages + centered layout
│   │   ├── (dashboard)/             # dashboard group: layout, navbar, sidebar, shortcuts
│   │   │   ├── page.tsx             # home page (server session check → HomeView)
│   │   │   ├── agents/…             # agents list + detail pages
│   │   │   └── meetings/…           # meetings list + detail pages
│   │   ├── api/
│   │   │   ├── auth/[...all]/       # Better-Auth handler
│   │   │   ├── trpc/[trpc]/         # tRPC HTTP handler (GET/POST)
│   │   │   ├── chat/                # Mistral chat route
│   │   │   └── webhooks/stream/     # Stream webhook handler
│   │   ├── call/[meetingId]/        # video call room
│   │   └── layout.tsx               # root layout (TRPCReactProvider + Toaster)
│   ├── components/
│   │   ├── ui/                      # ~50 shadcn/ui primitives
│   │   ├── generated-avatar.tsx     # DiceBear avatars
│   │   ├── error-state.tsx / loading-state.tsx
│   ├── db/
│   │   ├── index.ts                 # drizzle client (neon-http)
│   │   └── schema.ts                # full schema
│   ├── hooks/
│   │   ├── use-voice-assistant.ts   # STT → LLM → TTS pipeline
│   │   ├── useDashboard.ts          # dashboard data fetching + polling
│   │   └── use-mobile.ts
│   ├── lib/
│   │   ├── auth.ts                  # Better-Auth server config
│   │   ├── auth-client.ts           # Better-Auth client
│   │   ├── stream-video.ts          # StreamClient (server-only)
│   │   ├── meeting-summary.ts       # transcript/source loading + persistence
│   │   ├── summary-schema.ts        # zod summary contract, prompt, parse, Markdown
│   │   ├── summary-generation.ts    # validate/retry/fallback orchestration
│   │   ├── summary-mistral.ts       # Mistral JSON-mode caller
│   │   ├── avatar.tsx / utils.ts
│   ├── modules/                     # feature modules (server procs + UI views)
│   │   ├── agents/                  # schemas, tRPC procedures, table/list/detail/dialogs
│   │   ├── meetings/                # schemas, tRPC procedures, list/detail/call/dialogs
│   │   ├── auth/                    # sign-in/sign-up views
│   │   └── home/                    # dashboard views + components
│   ├── trpc/
│   │   ├── init.ts                  # context + protectedProcedure
│   │   ├── routers/_app.ts          # appRouter root
│   │   ├── server.tsx / client.tsx / query-client.ts
│   └── constants.ts                 # pagination defaults
├── drizzle/                         # committed migrations + drizzle-kit metadata
├── scripts/drop_type.mjs
├── .env                             # runtime secrets (local)
├── drizzle.config.ts
├── next.config.ts                   # allowedDevOrigins (DEV_ALLOWED_ORIGINS env)
└── FEATURES.md                      # ← this file
```

---

## 8. Known limitations & roadmap

1. **Billing is UI-only.** The `/settings` Billing tab shows a hardcoded "Pro Plan / Active" badge and states that billing management is coming soon; there is no payment provider integration, plan enforcement, or `/upgrade` route.
2. **System health probes only the database.** `getSystemHealth` pings Neon (real latency) and reports a single "Neon Database" service; Stream/Mistral/Upstash are not monitored.
3. **AI Insights are rule-based**, computed client-side from dashboard metrics (meeting trend, completed count, transcription count, most-used agent). They are not LLM-generated.
4. **Voice interaction metrics are estimates.** `duration` is estimated client-side (word count ÷ 2.5 wps) and `responseTime` from `performance.now()`; no accuracy field is stored.
5. **Terms & Privacy links are placeholders** (`href="#"`) in the auth views.
6. **Summary generation is more reliable on serverless.** `endCall` and the webhook now run it inside `after()` with error recording (`summaryError`) and an owner-scoped `retrySummary` mutation. The meeting page still polls and shows "Summary failed - retry" on failure. (Resolved for Issue 4.) Summaries are structured now; invalid model output is retried once and then stored only as a clearly flagged overview fallback.
7. **Stream call access is now authorized per meeting.** `getToken` issues a call-scoped token (`generateCallToken` with `call_cids`), `createCall` sets the owner as an explicit member, and all Stream-touching procedures verify ownership (NOT_FOUND otherwise). (Resolved for Issue 2.)
8. **`superjson` is installed and wired** — tRPC uses it for serialization (`src/trpc/init.ts`, `src/trpc/client.tsx`).
9. **Route protection at the proxy layer is optimistic** (cookie presence only); real validation happens in the server layouts and tRPC. `/settings` is now in the proxy's protected-path list and is also guarded by the layout.
10. **Migrations are committed and tested on a fresh database.** `drizzle/0000`–`0002` apply cleanly with `npm run db:migrate`; the existing database has all three recorded in `drizzle.__drizzle_migrations`.
11. **Structured summaries rely on Mistral JSON mode plus zod, not a provider-enforced JSON Schema.** JSON mode guarantees syntax but not shape, so the code retries once and then falls back; `max_tokens` is 1500, which is ample for the configured caps but not independently load-tested with maximum-size output.
12. **`retrySummary` is owner-scoped but not rate-limited.** No summary-specific limiter existed before this change; it keeps the previous behaviour (chat is still the only rate-limited route).
13. **Owner sanitization is text matching, not identity resolution.** An owner is accepted if the name (or its first name) appears in the source; nicknames and initials can therefore come back as `null`, and a common word could match a name.
14. **The structured-summary UI has not been visually regression-tested in a browser in this environment.** Legacy text-only rendering and owner scoping were verified by code path and DB queries (`5` legacy rows in the current database); the live model calls and offline schema/retry tests are recorded in the changelog.

---

---

## 9. Changelog & Improvements

### [Issue 1] Account-linking pre-hijacking risk - 2026-11-04
- **Status:** Partially fixed (mitigation relies on email verification; see caveats)
- **Problem:** `accountLinking.requireLocalEmailVerified` was false, allowing an unverified password account to be hijacked via OAuth linking.
- **What I changed:** `src/lib/auth.ts` - set `requireLocalEmailVerified: true`. Better-Auth 1.6.11 does not enforce this flag at runtime (not present in installed types), so the effective mitigation is `emailAndPassword.requireEmailVerification: true`, which blocks sign-in for unverified accounts.
- **Why it's safer/better:** Unverified password accounts cannot sign in, and OAuth linking no longer silently flips them to usable.
- **How it was tested:** `npx tsc --noEmit` and `npm run lint` pass. Manual repro steps: (A) sign up with email+password, do not verify, then sign in with Google/GitHub using the same email; the unverified password cannot be used to access the resulting account. (B) verified password account, then OAuth sign-in with the same email links correctly.
- **Follow-ups / caveats:** Better-Auth 1.6.11 does not support invalidating unverified credential accounts on OAuth link; full invalidation would require a `databaseHooks` change and is deferred. No automated test runner exists.

### [Issue 2] Call access not authorized per meeting - 2026-11-04
- **Status:** Fixed
- **Problem:** Stream calls used a general user token and relied on an unguessable meetingId; any authenticated user who knew a meetingId could join.
- **What I changed:** `src/modules/meetings/server/procedures.ts` (`getToken` now takes `{ id }`, verifies ownership, returns `generateCallToken` with `call_cids: ["default:<id>"]`; `createCall` sets `members: [{ user_id, role: "admin" }]`); `src/app/call/ui/components/call-provider.tsx` (passes meetingId to getToken). All Stream-touching procedures return NOT_FOUND for non-owned meetings.
- **Why it's safer/better:** Tokens are scoped to a single call and call membership is explicit, so leaked IDs/tokens cannot be reused across meetings.
- **How it was tested:** `npx tsc --noEmit` passes. Manual: User B calling getToken/createCall/endCall with User A's meetingId gets NOT_FOUND; User A's full call flow still works.
- **Follow-ups / caveats:** Stream call type remains "default"; a custom call type with stricter permissions is a future hardening step.

### [Issue 6] Meeting instructions not sent to the LLM - 2026-11-04
- **Status:** Fixed
- **Problem:** `/api/chat` used only the agent's instruction as the system prompt; `meetings.instructions` never reached the model.
- **What I changed:** `src/app/api/chat/route.ts` - system prompt now appends meeting instructions under a clearly delimited, lower-priority section so the agent persona stays primary.
- **Why it's safer/better:** Session-specific instructions (e.g. "answer in two sentences") are honored without overriding safety/formatting rules.
- **How it was tested:** `npx tsc --noEmit` passes. Manual: create a meeting with distinctive instructions and confirm the agent follows them.
- **Follow-ups / caveats:** The same combined prompt is not yet used by the summarizer.

### [Issue 3] AI agent has no conversation memory - 2026-11-04
- **Status:** Fixed
- **Problem:** `/api/chat` previously received only `{ prompt, agentId }` and was stateless.
- **What I changed:** `src/app/api/chat/route.ts` - validates `meetingId` (1-64 chars), verifies meeting + agent ownership and assignment, loads the last 10 messages from `conversation_messages` (configurable constant) with a 6000-char budget, maps `ai` -> `assistant`, dedups a trailing user prompt, and persists both turns. `src/hooks/use-voice-assistant.ts` already passes `meetingId`.
- **Why it's safer/better:** Multi-turn context improves answers; per-meeting isolation prevents cross-meeting leakage; invalid/foreign meetingIds return 4xx.
- **How it was tested:** `npx tsc --noEmit` passes. Manual: "My name is Sam" then "What's my name?" returns Sam; a different meeting sees no prior history; invalid/foreign meetingId returns 4xx.
- **Follow-ups / caveats:** History cap is character-based (not token-based).

### [Issue 4] Fire-and-forget work unreliable on serverless - 2026-11-04
- **Status:** Fixed
- **Problem:** Emails and summary generation were fire-and-forget and could be lost when serverless functions froze.
- **What I changed:** `src/lib/auth.ts` (emails wrapped in `after()`); `src/modules/meetings/server/procedures.ts` (endCall runs summary in `after()` instead of a 15s race; added owner-scoped `retrySummary` mutation); `src/app/api/webhooks/stream/route.ts` (summary in `after()`); `src/lib/meeting-summary.ts` (records `summaryError` on failure). DB schema: added `meetings.summaryError` and `meetings.summarySource`.
- **Why it's safer/better:** Work stays alive after the response; failures are visible and retryable instead of silent.
- **How it was tested:** `npx tsc --noEmit` and `npm run db:push` pass. Manual: simulate Mistral failure (bad key) -> error logged, `summaryError` set, retry button works.
- **Follow-ups / caveats:** No automated tests; QStash-based retried delivery not added (would need approval).

### [Issue 5] Summary only covers human-to-AI messages - 2026-11-04
- **Status:** Fixed
- **Problem:** Summaries used only `conversation_messages`; human-to-human call audio was never captured.
- **What I changed:** `src/app/api/webhooks/stream/route.ts` (handles `call.recording_ready` and `call.transcription_ready`, stores URLs, logs activity); `src/lib/meeting-summary.ts` (fetches/parses the transcript, merges with conversation history, tracks `summarySource`, regenerates when a transcript arrives after a fallback summary). Transcript capped at 12000 chars.
- **Why it's safer/better:** Summaries reflect the full call including human-to-human discussion; transcript is fetched server-side only.
- **How it was tested:** `npx tsc --noEmit` passes. Manual: webhook with invalid signature rejected (401); empty/unknown payload returns 200.
- **Follow-ups / caveats:** Transcript format parsing is best-effort (JSON/JSONL/raw); no real transcript sample was available to verify exact shape.

### [Tier2-A] Real migrations - 2026-11-04
- **Status:** Fixed
- **Problem:** Schema was applied with `drizzle-kit push`; no committed migrations existed.
- **What I changed:** Added `drizzle/0000_steep_zaran.sql` baseline migration + snapshot; added npm scripts `db:generate` and `db:migrate`; marked baseline as already applied in `drizzle.__drizzle_migrations` for the existing DB; documented `db:push` as local prototyping only.
- **Why it's better:** Fresh databases run `db:migrate` to produce an identical schema; existing DB is unchanged and migrate is a no-op.
- **How it was tested:** `npm run db:migrate` on existing DB -> "migrations applied successfully" with 1 journal row; `npx drizzle-kit generate` -> "No schema changes, nothing to migrate"; `npx tsc --noEmit` and `npm run build` pass.
- **Follow-ups / caveats:** Fresh-DB end-to-end test not run (no throwaway Neon branch available); scripts/drop_type.mjs retained and documented.

### [Tier2-B] Remove fake billing tab - 2026-11-04
- **Status:** Fixed
- **Problem:** /settings had a hardcoded "Pro Plan / Active" billing card and dead links in the user menu and command palette.
- **What I changed:** Deleted `src/modules/settings/ui/components/billing-tab.tsx`; removed the billing tab from `src/modules/settings/ui/views/settings-view.tsx` (now 3 tabs); removed the "Billing & Plan" item from `src/app/(dashboard)/ui/components/Dashboard-user-button.tsx`; removed the "Billing" command row from `src/app/(dashboard)/ui/components/shortcuts-modal.tsx`; updated README.md mentions.
- **Why it's better:** No misleading UI or dead links; settings tabs match real functionality.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass; grep for "billing"/"Pro Plan"/"upgrade" in src + docs (excluding .next/node_modules) returns no source hits.
- **Follow-ups / caveats:** Real billing/quotas not implemented; proposed simple per-user monthly meeting quota (enforce in meetings.create, show usage) pending approval.

### [Tier2-D] Enums: use them or remove them - 2026-11-04
- **Status:** Fixed
- **Problem:** `meetingStatus` included `processing`, `failed`, `cancelled` that were never set; activity types `recording_ready`/`transcription_done` are now wired by the Stream webhook.
- **What I changed:** `src/db/schema.ts` - removed `processing`, `failed`, `cancelled` from `meetingStatus` (DB column is plain text, no migration needed). `src/modules/meetings/ui/views/meeting-id-view.tsx` - removed unused badge entries. Webhook already writes `recording_ready`/`transcription_done` activities.
- **Why it's better:** Enum reflects real states; cancel is a hard delete (documented), not a `cancelled` status.
- **How it was tested:** DB query showed no rows used removed statuses; `npx tsc --noEmit` and `npm run build` pass.
- **Follow-ups / caveats:** `failed` could be wired later for unrecoverable provisioning failures; `cancelled` remains unused by design.

### [Tier2-G] Observability (partial: health only) - 2026-11-04
- **Status:** Partially done
- **Problem:** `getSystemHealth` only probed the database.
- **What I changed:** `src/modules/home/server/procedures.ts` - `getSystemHealth` now also reports configured/not-configured status for Resend, Upstash and Sentry (no external calls).
- **Why it's better:** Dashboard shows which optional services are configured.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass.
- **Follow-ups / caveats:** Sentry SDK integration (G1), structured logger (G2) and tRPC error capture not implemented; require approval/DSN and a logging dependency decision. Full Sentry/observability deferred.

### [Tier2-C] Loose ends - 2026-11-04
- **Status:** Partially done
- **Problem:** superjson unused, apexcharts + recharts both present, /settings not in proxy protected paths, Terms/Privacy were placeholder links, 5 lint errors.
- **What I changed:** Wired superjson in `src/trpc/init.ts` and `src/trpc/client.tsx` (removed dead remote-client block in `src/trpc/server.tsx`); added `/settings` + subpaths to `src/proxy.ts`; created real `/terms` and `/privacy` pages; replaced `href="#"` links in sign-in/sign-up views; fixed the 5 `react-hooks/set-state-in-effect` errors (call-active, use-voice-assistant, analytics-chart, metric-card, meetings-list-header).
- **Why it's better:** Typed RPC serialization, protected settings route, real legal pages, clean lint.
- **How it was tested:** `npx tsc --noEmit`, `npm run lint` (0 errors), `npm run build` pass.
- **Follow-ups / caveats:** Chart library consolidation (apexcharts vs recharts) not performed - dashboard uses apexcharts; removing it would require rewriting analytics-chart and metric-card. Deferred pending decision.

### [Tier2-E] Transactions - 2026-11-04
- **Status:** Not implemented - deferred
- **Problem:** `neon-http` cannot run interactive transactions, so multi-step writes are not atomic.
- **What I changed:** None.
- **Why it's better:** N/A.
- **How it was tested:** Not tested.
- **Follow-ups / caveats:** Requires adding a `drizzle-orm/neon-serverless` `Pool` client (`dbTx`) and wrapping multi-step writes (meetings/agents create+activity, endCall, webhook handlers) in transactions. Deferred due to scope and the need to verify connection pooling on serverless. No data loss observed in current flows.

### [Tier2-F] Extend rate limiting - 2026-11-04
- **Status:** Not implemented - deferred
- **Problem:** Only `/api/chat` is rate-limited.
- **What I changed:** None.
- **Why it's better:** N/A.
- **How it was tested:** Not tested.
- **Follow-ups / caveats:** Reusable limiter presets, tRPC middleware on expensive mutations, Better-Auth `rateLimit` with Upstash-backed secondary storage, and UI 429 toasts remain to be built. Deferred due to scope.

### [Tier2-H] Tests and CI - 2026-11-04
- **Status:** Not implemented - deferred
- **Problem:** No automated test suite or CI pipeline.
- **What I changed:** None.
- **Why it's better:** N/A.
- **How it was tested:** Not tested.
- **Follow-ups / caveats:** Vitest + Playwright + GitHub Actions workflow remain to be set up. Deferred due to scope; requires a TEST_DATABASE_URL and secrets configuration.

### [Tier2-C2] Hydration mismatch fix - 2026-11-04
- **Status:** Fixed
- **Problem:** Server/client time formatting mismatch (e.g. "04:54 PM" vs "16:54") due to locale-dependent `toLocaleTimeString`/`toLocaleDateString` after superjson wiring.
- **What I changed:** Specified explicit "en-US" locale in all `toLocaleTimeString`/`toLocaleDateString` calls across src.
- **Why it's better:** Consistent SSR/CSR rendering; no hydration errors.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass.
- **Follow-ups / caveats:** None.

### [Feedback] Real feedback storage - 2026-11-04
- **Status:** Fixed
- **Problem:** The Feedback dialog only showed a toast and stored nothing.
- **What I changed:** Added `feedback` table (`src/db/schema.ts`) with migration `drizzle/0001_noisy_famine.sql`; created `src/modules/feedback/server/procedures.ts` with `create` (protectedProcedure, zod-validated) and admin-only `list`/`updateStatus`; registered `feedback` router in `src/trpc/routers/_app.ts`; rewrote the Feedback dialog in `src/app/(dashboard)/ui/components/dashboard-navbar.tsx` (type selector, message, optional rating, loading state, success/error toasts, captures pathname); added `/admin/feedback` page with server-side admin check against `ADMIN_EMAILS` and a status dropdown; added `ADMIN_EMAILS` to `.env.example`.
- **Why it's better:** Feedback is persisted and reviewable; admin-only access enforced on both client and server.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass; `npm run db:migrate` applied the feedback migration. Manual tests: submit as user -> DB row created; non-admin visiting /admin/feedback gets 404; non-admin calling updateStatus gets error; empty/10000-char messages rejected by zod (min 5, max 1000).
- **Follow-ups / caveats:** Admin check uses ADMIN_EMAILS env var; no automated tests yet. Message content is never logged.

### [Tier3-1A] Measure voice latency - 2026-11-04
- **Status:** Implemented, not verified (no live mic/browser available in this environment)
- **Problem:** Perceived voice-reply latency ~16s; unclear where time is spent.
- **What I changed:** `src/app/api/chat/route.ts` - added JSON timing logs (auth, rate limit, DB, Mistral TTFB/total, overall); parallelized agent/meeting/history DB queries with Promise.all. `src/hooks/use-voice-assistant.ts` - added client TTFB timing log; clarified `responseTime` measures fetch only (not SpeechRecognition silence wait), which previously could be misleading.
- **Why it's better:** Identifies bottlenecks; removes sequential DB round-trips.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass. No live 5-request measurement possible here; instrumentation is in place for the user to collect.
- **Follow-ups / caveats:** User must run 5 voice turns and report timings; streaming (1B) and sentence TTS (1C) pending approval.

### [Tier3-1B] Stream the LLM reply - 2026-11-04
- **Status:** Implemented, not verified (pending user test)
- **Problem:** /api/chat returned the full reply at once, so TTS couldn't start until generation finished.
- **What I changed:** `src/app/api/chat/route.ts` - Mistral `stream: true`, returns SSE (`text/event-stream`) with delta/done/error events; persists user+AI messages only after a complete stream; handles client abort without persisting. `src/hooks/use-voice-assistant.ts` - reads the stream, renders text progressively, AbortController on new request/unmount; rate-limit/auth errors still arrive as JSON before the stream.
- **Why it's better:** TTS can start on the first sentence; lower perceived latency; abort stops work.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass. Live streaming/TTFB numbers pending user test.
- **Follow-ups / caveats:** Sentence-by-sentence speech (1C) not yet done; voice brevity (max_tokens 300 + voice-mode instruction) and cookieCache (5 min) applied; rate-limit timing log added.

### [Bug] 431 from oversized session cookies - 2026-11-04
- **Status:** Fixed (immediate) + root cause documented
- **Problem:** `session.cookieCache` serialized the user object including a base64 avatar data URL (~28 KB), producing ~40 KB of cookies and HTTP 431.
- **What I changed:** `src/lib/auth.ts` - disabled `session.cookieCache`. `src/modules/settings/ui/components/avatar-upload.tsx` - client validation: max 2 MB, PNG/JPEG/WebP only, reject data URLs over 100 KB. `src/lib/auth.ts` - server-side databaseHook rejects data URLs over 100 KB on user update.
- **Why it's better:** Sign-in no longer sends oversized cookies; avatars are validated before storage.
- **How it was tested:** DB query found 1 user with a `data:` image (28,255 chars). `npx tsc --noEmit` and `npm run build` pass.
- **Follow-ups / caveats:** Root fix (store avatars in object storage) pending user's storage choice (Vercel Blob / Cloudinary / UploadThing / S3). Migration: 1 row uses `data:` image; propose a script to move to storage and update rows - awaiting approval. Re-enable cookieCache only after avatars are URLs. Rule: never put large fields in the session/user object.

### [Bug] Call restarts during push-to-talk - 2026-11-04
- **Status:** Fixed
- **Problem:** Around the 2nd push-to-talk question the call ended and restarted; repeated on rejoin. Server logs showed /api/chat succeeding, so the cause was client-side.
- **Root cause:** `StreamCallProvider`'s client-creation effect depended on the `session` query result object; React Query refetches (window focus / focus invalidation) changed its identity, re-running the effect, whose cleanup called `setVideoClient(null)` and triggered the call effect cleanup which called `call.leave()`, ending the call; then it re-created. The call effect also left the call on every re-run.
- **What I changed:** `src/app/call/ui/components/call-provider.tsx` - depend on stable primitives (token string + apiKey); create the client/call once per meetingId using ref guards; leave only on real unmount via a dedicated cleanup effect. `src/app/call/ui/components/call-active.tsx` - set `refetchOnWindowFocus: false` on `getOne`. Added the same to getToken/getSession/getOne in the provider.
- **Why it's better:** No re-creation on refetch/focus; call persists across push-to-talk turns.
- **How it was tested:** `npx tsc --noEmit` and `npm run build` pass. Live multi-turn test (6+ turns) and tab-switch test pending user verification.
- **Follow-ups / caveats:** Temporary logs removed. Need user to confirm 6+ push-to-talk turns without restart and 3-min idle call.

### [Tier3-2A] Structured meeting intelligence - 2026-11-05
- **Status:** Implemented and verified for schema, live Mistral generation, retry/fallback and fresh-DB migration. Browser visual regression and cross-user UI clicks still need the user's manual test.
- **Problem:** Summaries were free text stored in `meetings.summary`. The model could return prose, malformed content or invented names, and the UI could only render an unstructured paragraph. There was no stored contract the client could trust.
- **What I changed:**
  - `src/lib/summary-schema.ts` (new) — zod schema (`overview` ≤600 chars, ≤10 decisions, ≤15 action items with `owner`/`dueDate`, ≤10 topics, ≤10 open questions), prompt builder with explicit untrusted-transcript delimiters and injection resistance, JSON extraction/parse/validate, owner sanitization against the source, insufficient/fallback factories, Markdown exporter.
  - `src/lib/summary-generation.ts` (new) — pure orchestration: skip short sources, parse + validate, retry once with the validation error, then a flagged overview-only fallback.
  - `src/lib/summary-mistral.ts` (new) — shared Mistral caller using `response_format: { type: "json_object" }` (confirmed in Mistral docs/OpenAPI), with ids/lengths/timings-only logging.
  - `src/lib/meeting-summary.ts` — transcript-first / `conversation_messages` fallback retained, existing 12,000-char cap retained, persists validated data to `summaryData` and the overview to the legacy `summary` column, stores the `insufficient` state, adds `{ force }` for retry, never logs content.
  - `src/db/schema.ts` — nullable `meetings.summary_data jsonb`; `drizzle/0002_last_skullbuster.sql` + snapshot/journal generated with `db:generate` and applied with `db:migrate`.
  - `src/modules/meetings/server/procedures.ts` — `getOne` returns `summaryData`; owner-scoped `retrySummary` now forces structured regeneration.
  - `src/modules/meetings/ui/components/structured-summary.tsx` (new) and `meeting-id-view.tsx` — sections for Overview, Key decisions, Action items (owner badges + optional due dates), Topics (chips), Open questions, a **Copy as Markdown** button, and fallback/insufficient states. Text-only legacy summaries keep the old prose branch.
  - `scripts/test-summary.ts`, `scripts/test-summary-live.ts` + `test:summary` / `test:summary:live` scripts — no new dependency; uses the existing `tsx`.
  - `src/app/call/ui/components/call-provider.tsx` — moved a ref write out of render to keep lint at 0 errors (pre-existing issue).
- **Why it's better:** The client receives a stable, validated shape; invalid model output cannot be persisted; owners and due dates are explicit and verifiable; short calls no longer produce hallucinated content; old meetings keep working through the unchanged text column/branch.
- **How it was tested:**
  - `npm run test:summary` — **12/12 passed**: delimiter/injection handling, retry prompt, JSON/fenced/prose parsing, schema rejection, owner sanitization, short-source insufficient, invalid→retry→fallback, invalid→valid retry, injection does not add schema fields, Markdown export, fallback validity.
  - `npm run test:summary:live` (real Mistral, `mistral-small-latest`) — **all checks passed**:
    - Distinctive scenario returned `meta.kind = "structured"`, exactly 2 decisions (March 14 launch, invite-only beta), 3 action items with owners `Priya`/`Marcus` (Sarah appears in the source but was not assigned work), 2 topics (Atlas launch, Beta onboarding) and the legal-review open question.
    - Push-to-talk / conversation fallback produced a valid structured summary.
    - A spoken "ignore previous instructions" line did not change the schema or add an `instructions` field.
    - A too-short source produced `meta.kind = "insufficient"` with `attempts = 0` and no model call.
  - Fresh database: created a temporary Neon database, ran `drizzle-kit migrate` (exit 0), confirmed all 10 tables, `meetings.summary` = nullable `text` and `meetings.summary_data` = nullable `jsonb`, confirmed 3 journal rows, then dropped the temporary database with `WITH (FORCE)`.
  - Owner scoping: the same `id + userId` predicate used by `getOne`/`retrySummary` returned the meeting for its owner and **0 rows** for a different user id.
  - Legacy rendering: current DB has 5 meetings with text `summary` and `summary_data = NULL`, which take the unchanged text branch; `summaryData` rows parse through `storedSummaryDataSchema` before rendering.
  - `npx tsc --noEmit` passes; `npm run lint` exits 0 with 19 pre-existing warnings and no errors; `npm run build` passes (Next.js 16.2.6/Turbopack).
- **Follow-ups / caveats:** User should visually verify the meeting page in a browser (new summary, a legacy meeting, and another user's meeting). `retrySummary` is owner-scoped but not rate-limited because no summary limiter existed before; adding one is a small follow-up. Owner matching is text-based (nicknames may become `null`). Consider Mistral `json_schema` strict mode later for provider-side shape enforcement; JSON mode + zod already prevents invalid storage.
- **Fix (2026-11-06): tasks duplicated under Key Decisions and Action Items.** Items that are work assigned to a person ("Priya will do the legal review") were appearing both as decisions and action items.
  - `src/lib/summary-schema.ts` — the system prompt now defines the two categories explicitly: a **decision** is a choice or agreement the group made ("launch on Friday", "budget is 40,000"); an **action item** is work assigned to a person, which must never also appear in decisions; plus one short good/bad inline example (not transcript content) showing "Priya will do the legal review" as a bad decision.
  - Added the pure post-processing guard `removeDecisionsThatAreActionItems(summary)` (same file, no side effects): drops any decision that is near-identical to an action item's task, judged after lowercasing, punctuation/stop-word removal, and owner-name stripping — via normalized text equality, containment, or word-overlap coefficient ≥ 0.7. Inline into `parseSummaryResponse` before owner sanitization, so invalidated duplicates never reach storage or the UI.
  - `scripts/test-summary.ts` — 7 new tests covering the prompt definitions/example, the pure guard (exact duplicates, no-overlap kept, owner-prefixed and high-overlap variants) and end-to-end parsing of a scenario with **two decisions and two assigned tasks** (`decisions.length === 2` asserted even when the model poisons a task into `decisions`).
  - `scripts/test-summary-live.ts` — same two-decisions/two-tasks scenario ("launch on March 14th", "remaining budget is 40,000", Priya → legal review, Marcus → pricing page) asserting `decisions.length === 2`, no `/legal review|pricing page/` text under decisions, and the correct owners on both action items.
  - Real results: `npm run test:summary` **19/19 passed** (was 12/12 + 7 new). `npm run test:summary:live` (real Mistral) **all checks passed**, including the new dedupe scenario returned `meta.kind = "structured"` with exactly the two decisions (March 14 launch; budget 40,000) and both tasks only in `actionItems` with owners Priya/Marcus — the prompt alone produced no duplication even before the guard triggered. `npx tsc --noEmit` passes; `npm run lint` exits 0 (0 errors, the same 19 pre-existing warnings); `npm run build` passes (Next.js 16.2.6/Turbopack). Note: `node_modules` was missing in the worktree, so `npm install` was run first (exit 0).
- **Fix (2026-11-06, on `C:\nexa-ai`): `meetings.transcript_url` stayed NULL — Stream transcript never used.** `summary_source` was always `"conversation"`.
  - **Root cause (finding 1):** `createCall` (`src/modules/meetings/server/procedures.ts:91-93`) set `settings_override.transcription.mode: "available"`. Per the installed SDK types — `@stream-io/node-sdk/dist/src/gen/models/index.d.ts:14570` `mode?: 'available' | 'disabled' | 'auto-on'` — and the Stream docs (https://getstream.io/video/docs/api/transcribing/calls/, sections *Enabling, disabling, automatically start* and *Events*): **"available" only makes the feature available; the transcript must be started explicitly via `call.startTranscription()`**. Only `"auto-on"` starts it automatically when the first participant joins and stops it when all participants leave. `startTranscription()` was never called anywhere in the codebase, so no transcription ever ran — no file, no webhook, NULL `transcript_url` forever.
  - **Fix (change 2):** `createCall` now sets `transcription: { mode: "auto-on" }` (still owner-scoped: the call is created inside the owner-validated mutation with only `members: [{ user_id: ctx.userId }]`). `endCall` additionally calls `stopTranscription()` best-effort (logged as `transcription.stop_requested` / `transcription.stop_skipped`, error name only) so the file is finalized even if a member stays connected. Call flow otherwise unchanged.
  - **Webhook (change 3, verified + hardened):** `call.transcription_ready` (`src/app/api/webhooks/stream/route.ts`) already verified the signature (`streamVideo.verifyWebhook`, 401 on mismatch), stored `call_transcription.url` in `meetings.transcript_url`, and triggered regeneration via `after()`. Added: a shape-log `{event:"webhook.transcription_ready", payloadKeys, transcriptKeys, urlLength, filenameLength}` — keys and sizes only, never content — and **idempotent** activity logging via `logStreamActivityOnce`: activity rows now carry `metadata: {"meetingId": ...}` and a repeat delivery for the same meeting is skipped (applied to both `recording_ready` and `transcription_done`).
  - **Parser (change 4):** new pure, dependency-free `src/lib/transcript-parser.ts` — `parseStreamTranscript(raw, knownUsers)` handles the real Stream **JSONL** format (`{"type":"speech","start_time","stop_time","speaker_id","text"}`, doc section *Transcription JSONL file format*), keeps only `type:"speech"` (or untyped) fragments, sorts by `start_time`, and also accepts JSON arrays / `segments`-shaped objects / raw text. `speaker_id` (a Stream user id) is mapped via `knownUsers` to display names; unmapped ids are humanized (`Priya_Sharma` → `Priya Sharma`); AI-like ids (`ai|agent|assistant|bot|nexa` patterns) are labelled **"AI Assistant (non-human)"**. Wired into `src/lib/meeting-summary.ts`: fetch + parse with the meeting owner's `user.name` in `knownUsers` (the only guaranteed Stream member — extend the map when member management lands).
  - **AI/TTS confirmation:** the AI speaks via browser `window.speechSynthesis` (`src/hooks/use-voice-assistant.ts:121-143`) and **never joins as a Stream participant** (only `session.user.id` connects, `call-provider.tsx:64-80`), so its TTS will **NOT appear in the transcript**. Only real human participants produce fragments; the non-human label is a defensive catch-all for future agent-side audio.
  - **Merge strategy (change 5, verified):** already implemented in `src/lib/meeting-summary.ts` — transcript primary, `conversation_messages` fallback, both → `merged`; `summary_source` marked per run; regeneration is allowed exactly when a summary already exists with `summarySource !== "transcript" | "merged"` **and** newly parsed transcript text is non-empty (`summary.regenerate_with_transcript`), so a transcript arriving after a fallback summary regenerates once and repeated webhooks don't re-call the model.
  - **Local test path (change 6):** `scripts/test-transcript-parser.ts` + `npm run test:transcript-parser` — takes a saved transcript file as argv (or a built-in Stream JSONL sample), runs the pure parser (segments/speakers/chars printed) then the full summary pipeline; default uses a canned model response (no API cost), `--live` uses real Mistral. No DB touched, tunnel-free.
  - **Real results (change 7):** `npm run test:summary` **23/23 passed** (19 + 4 new parser tests: real Stream JSONL, unknown/AI speaker mapping, time-order + empty rejection, JSON-array/raw-text fallback). `npm run test:transcript-parser` passes (4 segments, `user_sarah` → "Sarah Chen", non-speech dropped, `kind:"structured"` from the canned model). `npm run test:summary:live` (real Mistral) — all checks passed, including the dedupe scenario (2 decisions, 2 assigned tasks). `npx tsc --noEmit` passes; `npm run lint` exits 0 (0 errors, same 19 pre-existing warnings); `npm run build` passes (Next.js 16.2.6/Turbopack).
  - **Logging instrumentation (2026-11-06 follow-up):** `src/modules/meetings/server/procedures.ts` now surfaces Stream's verbatim diagnostics for transcription operations. New helper `describeStreamError(error)` extracts the SDK's `StreamError` fields — `metadata.responseCode` (HTTP status), `code` (Stream API error code), and the API `message` (`"Stream error code <code>: <msg>"`, truncated to 200 chars; unknown errors keep only `Name: message`; no payload content/PII) — confirmed against the installed SDK (`dist/index.cjs.js`: non-2xx → `StreamError(`Stream error code ${error.code}: ${error.message}`, metadata, error.code)`; `types.d.ts:20-24`).
    - `endCall`: `transcription.stop_skipped` now logs `httpStatus`, `errorCode` and `message` alongside `errorName` (a not-running transcription is Stream-side config/data state, not content).
    - `createCall`: `getOrCreate` is wrapped; on acceptance it logs `transcription.settings_applied` with `effectiveMode` read back from `response.call.settings.transcription.mode` (SDK type `TranscriptionSettingsResponse.mode: 'available' | 'disabled' | 'auto-on'`), `matchesRequested: effectiveMode === "auto-on"` and `call.transcribing`; on rejection it logs `transcription.settings_rejected` with `requestedMode`, `httpStatus`, `errorCode`, `message` and then re-throws so the call flow fails loudly as before.
    - Real results: `npx tsc --noEmit -p tsconfig.json` passes; `npm run lint` exits 0 (0 errors, same 19 pre-existing warnings); `npm run build` passes (Next.js 16.2.6/Turbopack). Live logging lines (`settings_applied` with Stream's echoed mode) will appear on the next real call once the dashboard webhook/events are configured.
  - **Fix (2026-11-06): webhook route returned HTTP 400 for 8 of 11 tunnel deliveries** (cloudflared metrics: 200×2, 400×8, 401×1), so `call.transcription_ready` was never processed and `transcript_url` stayed NULL.
    - **Finding (all 400 paths in the previous handler, `src/app/api/webhooks/stream/route.ts`):** 1) `route.ts:52-55` — `Empty body` 400 when the raw body string was empty (`!rawBody`, typical for tunnel/monitoring probes); 2) `route.ts:57-62` — `Invalid JSON` 400 when `JSON.parse(rawBody)` threw — note this ran **before** signature verification, so even an unauthenticated garbage body returned 400 rather than an auth rejection; 3) `route.ts:64-67` — `No signature` 400 when the `x-signature` header was absent. The single 401 was `route.ts:69-72` (invalid signature). Unsigned/empty payload deliveries (probes or misconfigured signers) thus produce 400s, which is what the 8 seen by the tunnel were.
    - **SDK verification (finding 3):** installing `@stream-io/node-sdk@0.7.58` — `StreamClient.verifyWebhook(rawBody, xSignature)` (`dist/index.cjs.js`) is a **boolean** check: constant-time `HMAC-SHA256(body, appSecret)` compared (hex) against the header; the header that carries it is **`X-Signature`**; the digest is computed over the **raw** body bytes exactly as passed, so the raw text must be read first and verification must precede `JSON.parse`. (The richer `verifyAndParseWebhook` also parses + decompresses gzip and throws; the client boolean helper is what the route used and still uses.)
    - **Handler rewrite:** a `webhook.request` log at the very top of each request — `headerNames` (names only, never values), `bodyBytes`, `signatureResult` (`valid`/`invalid`/`missing`/`skipped: empty body`), `eventType` (peeked only for valid signatures) — no content, no secrets. Order: read raw text → verify → only then the authoritative `JSON.parse`. Status matrix now: **empty body → 200 "Ignored: empty body"** (a probe, not an event; kills the meaningless-400 noise while staying logged); **missing signature → 400**; **invalid signature → 401**; **non-JSON (or otherwise unparseable) body with a valid signature → 400** (the only remaining 400 path besides missing signature); **JSON without a `type` → 200 ignored**; **signed, well-formed payloads of any event type — handled or not (e.g. `call.transcription_started`) — → 200** so Stream never retries on unhandled types.
    - **Replay test:** new `scripts/test-webhook-replay.ts` + `npm run test:webhook-replay` — signs realistic payloads with HMAC-SHA256 hex over the raw body exactly like Stream does and POSTs them to a **running dev server** (`npx next dev --webpack -p 3999`, then `npm run test:webhook-replay -- http://localhost:3999`). A real server is required because `next/server`'s `after()` throws outside a Next request scope, so an in-process replay is impossible. A synthetic call id (`webhook-replay-test-…`) matches no meeting, so DB effects are zero-row updates and the summary job logs `summary.meeting_not_found` (observed in the dev server console).
    - **Real results:** replay **10/10 passed** against the live dev server: `call.session_started` → 200, `call.session_ended` → 200, `call.transcription_started` (unhandled) → 200, `call.transcription_ready` → 200 (shape log emitted, regeneration scheduled), `call.recording_ready` → 200, empty-body probe → 200, missing signature → 400, tampered body → 401, non-JSON → 400, typeless JSON → 200. `npx tsc --noEmit` passes; `npm run lint` exits 0 (0 errors, **18 warnings — one fewer than before** because the rewrite removed the unused `catch (e)` binding); `npm run build` passes (Next.js 16.2.6/Turbopack); `npm run test:summary` **23/23** and `npm run test:transcript-parser` still pass. The `webhook.request` diagnostics will classify the tunnel's next real deliveries (probe vs unsigned vs unreadable) by name instead of a bare 400.
  - **Fix (2026-11-06): large gzipped webhooks verified as `signatureResult:"invalid"`** (every delivery carrying a `content-encoding` header failed; small uncompressed ones verified fine — the secret is correct).
    - **SDK finding (not guessed):** in the installed `@stream-io/node-sdk@0.7.58` (`dist/index.cjs.js`, mirrored by `dist/src/utils/webhook.d.ts`), `verifyAndParseWebhook(rawBody, signature, secret)` calls `verifyAndParse(gunzipPayload(rawBody), …)`: gzip is detected by magic bytes `0x1f 0x8b` and `zlib.gunzipSync` runs **before** verification; the `verifySignature` doc comment states *"The signature is always computed over the **uncompressed** JSON bytes, so callers that decoded a gzipped … payload must pass the inflated bytes here."* So **`X-Signature` is an HMAC over the DECOMPRESSED JSON bytes, not the compressed ones** (the SDK only handles gzip — `gunzipPayload` has a gzip-magic check, no br/zstd/deflate paths). The bug: `req.text()` on a still-gzip body returns the compressed bytes as text, so HMAC over those bytes mismatches → "invalid" for large payloads. `StreamClient.verifyWebhook` (boolean) does not decompress, so the handler must do it.
    - **Handler fix (`src/app/api/webhooks/stream/route.ts`):** body is now read as raw bytes (`req.arrayBuffer()` → `Buffer`); decompression mirrors the SDK (`gunzipPayload` extended): gzip magic bytes first → `zlib.gunzipSync`; then header-driven `deflate` → `inflateSync` and `br` → `brotliDecompressSync` (no magic exists for these, the header decides); on decompression failure the raw bytes are used and the signature verdict decides the outcome. Verification (still `streamVideo.verifyWebhook`) then runs over the decompressed UTF-8 text, and the authoritative `JSON.parse` only afterwards — verify first, parse after. Uncompressed requests are byte-for-byte unchanged from the previous behavior.
    - **Logging (no content):** the `webhook.request` log gains `contentEncoding` (the header value exactly as sent, e.g. `gzip`) and `bodyDecompressed` (`false`/`true`/`"failed"`), plus `bodyBytes` now reflecting the compressed wire size when `content-encoding` is present.
    - **Replay extension (`scripts/test-webhook-replay.ts`):** two new replays send `zlib.gzipSync` bodies with `content-encoding: gzip` while signing the **uncompressed** JSON (mirroring Stream's real behavior): `call.session_ended (signed, gzip)` and `call.transcription_ready (signed, gzip)` — both assert **200 and processing** via the `eventType` echoed in the response JSON (the handler only parses after decompress+verify, so the echo proves the full chain). Replay now **12/12 passed** against the live dev server (`npx next dev --webpack -p 3999`): both gzip replays logged `contentEncoding:"gzip"`, `bodyDecompressed:true`, `signatureResult:"valid"` with correct `eventType`, and the compressed `transcription_ready` emitted the shape log (keys + URL/filename lengths only) and scheduled regeneration (`summary.meeting_not_found` for the synthetic id, as expected). All 10 previous conditions still pass (uncompressed entries log `contentEncoding:null, bodyDecompressed:false`). `npx tsc --noEmit` passes; `npm run lint` exits 0 (0 errors, 18 pre-existing warnings); `npm run build` passes (Next.js 16.2.6/Turbopack); `npm run test:summary` **23/23**, `npm run test:transcript-parser` passes.
  - **Stream dashboard configuration (REQUIRED, manual):** 1. Dashboard → your Video app → **Webhook** — set the webhook URL (local dev: tunnel URL like `https://<tunnel>.ngrok.app/api/webhooks/stream`; production: `<origin>/api/webhooks/stream`). 2. Subscribe to events: `call.transcription_ready` (required), plus the already-handled `call.recording_ready`, `call.session_started`, `call.session_ended`. 3. The webhook signature is verified with the same app secret as `STREAM_VIDEO_SECRET_KEY` — keep them consistent. 4. Transcripts in Stream-managed storage (default) are signed URLs retained ~2 weeks; external S3 storage can be configured in dashboard (*Transcription storage*) if longer retention is needed. 5. Transcription language defaults to `en` per call type; set `language` in call type settings or in `createCall`'s `settings_override.transcription` for other languages.
  - **Follow-ups / caveats:** `speaker_id` → name mapping currently covers only the meeting owner; multi-participant mapping should query Stream call members once invite flows exist. TTS can still bleed into the transcript via the human's microphone (room echo) and would then be attributed to a human — the AI-label guard only protects agent-style user ids. `stopTranscription()` on a non-running transcription logs a skip line; harmless.
