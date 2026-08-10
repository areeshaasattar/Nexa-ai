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
| RPC layer    | **tRPC v11** (`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/tanstack-react-query`) + `superjson`     |
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

> **Note:** the README/`AI_SETUP.md` describe a *provider‑agnostic* LLM backend (OpenRouter / Gemini /
> Groq). The **actual** current implementation in `src/app/api/chat/route.ts` and
> `src/lib/meeting-summary.ts` only calls **Mistral** (`MISTRAL_API_KEY`). See
> [§8 – Notes](#8-notes--discrepancies-found-while-reading-the-code).

---

## 3. Database schema

Defined in `src/db/schema.ts` (PostgreSQL dialect). Migrations are managed with `npm run db:push`
(drizzle‑kit push — see note in §8 about the stale `drizzle/` migration).

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
| `meetings`           | Scheduled calls: `name`, `userId`, `agentId` (FK → agents), `instructions`, `status`, `startedAt`, `endedAt`, `transcriptUrl`, `summary`, `recordingUrl` |
| `activities`         | Activity feed: `userId`, `type` (enum below), `title`, `description`, `metadata` (JSON string)                   |
| `conversation_messages` | Chat history per meeting: `meetingId` (FK cascade), `role` (`user`/`ai`), `content`                            |
| `voice_interactions` | Dashboard metrics per voice exchange: `meetingId`, `duration`, `accuracy`, `responseTime`                        |

**Enums:**

- `meetingStatus` = `scheduled | ongoing | completed | failed | cancelled | processing`
- `activityType` = `meeting_created | meeting_started | meeting_completed | agent_created | agent_updated | agent_deleted | recording_ready | transcription_done`

**Indexes:** created on every `userId` FK, plus `meetingId` for messages and `identifier` for
verification. All FK relations use `onDelete: cascade` (deleting a user/agent/meeting removes
dependent rows).

---

## 4. Implemented features — full inventory

### 4.1 Authentication (`/sign-in`, `/sign-up`)
- Email + password sign‑in and sign‑up (password hashed by Better‑Auth, min 8 chars, confirm‑password validation).
- GitHub & Google **OAuth** social login.
- Session persistence via cookies; server‑side session checks on protected pages.
- Sign‑out from the user menu, command palette, and URL‑based auto‑sign‑in (see §5).

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
- **View** a meeting detail page ("Meeting Intelligence") showing status badge, date/start time, assigned agent, duration, mission instructions, and — once available — **recording link**, **raw transcript link**, and the **AI‑generated summary**. The page **auto‑polls every 5 s** while status is `completed` but the summary hasn't arrived yet.
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
- `src/lib/meeting-summary.ts` fetches all `conversation_messages` for a meeting, builds a transcript, and asks **Mistral** to produce a **3–5 sentence plain‑prose summary**.
- Result is stored on `meetings.summary`.
- **Idempotent** — skips if a summary already exists, safe to be triggered from both the Stream webhook and the client `endCall`.
- Triggered by: (a) Stream `call.session_ended` webhook, and (b) the client `meetings.endCall` mutation (a reliable fallback when the webhook can't reach localhost during dev).

### 4.7 Stream webhook handling (`/api/webhooks/stream`)
- Verifies the **HMAC‑SHA256 signature** (`x-signature` header) against the Stream secret via `streamVideo.verifyWebhook()`.
- `call.session_started` → meeting `status = ongoing`, `startedAt = now`.
- `call.session_ended` → meeting `status = completed`, `endedAt = now` + fire‑and‑forget summary generation.
- Gracefully returns 200/"ignored" for unknown/empty payloads.

### 4.8 Dashboard (`/`, `src/modules/home`)
Powered by `homeRouter.getDashboardData` (one aggregated query) + `homeRouter.hello` + `homeRouter.getSystemHealth`, fetched by the `useDashboard` hook with polling:
- **Hero section** — time‑of‑day greeting with the user's first name + 4 quick stats.
- **Metric cards** — Total Meetings, Active AI Agents, Voice Interactions, Recording Storage (with per‑card sparklines & trend arrows).
- **Intelligence Hub chart** — tabbed *Activity* (meeting volume, last 7 days, area chart) and *Performance* (avg meeting duration, line chart). Uses `recharts`.
- **Upcoming schedule** — list of scheduled meetings with agent, date & status.
- **Quick launch** — New Agent / Schedule / Instant Call shortcut cards.
- **AI Insights** — computed recommendations derived from metrics (e.g. "Meeting volume up X% this week").
- **System status monitor** — live check of the DB (real ping) + simulated latency/status for Stream/OpenRouter/Gemini. Polled every 30 s.
- **Recent activity timeline** — last 10 activity entries.

### 4.9 Dashboard shell & UX
- **Sidebar** (green‑950 theme) with Dashboard / Meetings / AI Agents navigation, logo, and a footer **user menu** (avatar, name, "Pro User" badge, profile/billing/security/settings menu items, **Sign Out**).
- **Top navbar** — sidebar toggle, "System Online" pill, **⌘K search bar** (opens command palette), and a **Feedback** dialog (sonner toast on submit).
- **Command palette (`⌘K`)** — keyboard‑driven launcher with *Navigate*, *Actions* (New Meeting, Upgrade to Pro), *Settings*, and *Help* sections + Sign Out. Also opens via the search box click (custom `open-shortcuts` event).
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

---

## 5. Authentication system — how it works

Authentication uses **Better‑Auth v1.6** with the **Drizzle adapter** backed by the Neon Postgres
`user`/`session`/`account`/`verification` tables. Below is the complete picture.

### 5.1 Server‑side setup — `src/lib/auth.ts`

```ts
export const auth = betterAuth({
  trustedOrigins: ["https://broadways-disprove-embargo.ngrok-free.dev"],
  socialProviders: {
    github: { clientId: ..., clientSecret: ... },
    google: { clientId: ..., clientSecret: ... },
  },
  emailAndPassword: { enabled: true },
  database: drizzleAdapter(db, { provider: "pg", schema: { ...schema } }),
});
```

Key points:
- **`emailAndPassword.enabled: true`** → enables `/sign-in/email`, `/sign-up/email` and `/sign-out` endpoints.
- **Social providers** → GitHub + Google OAuth configured from env vars.
- **`trustedOrigins`** → allows the ngrok tunnel URL during development (a hosted origin that differs from `BETTER_AUTH_URL`).
- **Drizzle adapter** → sessions/accounts are persisted in the Drizzle schema tables.
- Required env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (base URL, currently `http://localhost:3000`), plus `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, and `DATABASE_URL`.

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
  - Also supports **URL auto‑sign‑in**: if `?email=` and `?password=` are present in the query string, it submits automatically on mount (used for deep‑link/dev flows).
- **`signUp.email({ email, password, name, callbackURL: "/" })`** → creates the account, signs the user in, redirects to `/`.
  - Client‑side rules: name ≥ 2 chars, valid email, password ≥ 8 chars, password === confirm.
- **`signIn.social({ provider: "google" | "github", callbackURL: "/" })`** → redirects to the provider's OAuth consent, then back to the app with an authenticated cookie.
- Error handling via `onError` callbacks → `sonner` toasts ("Authentication Failed", "GitHub Error", etc.).
- A **"Forgot password?"** link and Terms/Privacy links exist in the UI (currently non‑functional placeholders — no reset‑password flow wired up).

### 5.5 Session checks & route protection

Three layers protect the app:

1. **Page‑level (server)** — e.g. `src/app/(dashboard)/page.tsx`:
   ```ts
   const session = await auth.api.getSession({ headers: await headers() });
   if (!session) return redirect("/sign-in");
   ```
   Any unauthenticated visit to the dashboard is redirected to `/sign-in`. (The meetings/agents
   pages are inside the same `(dashboard)` route group, but only the home page performs this check —
   see §8 note.)

2. **tRPC context** — `src/trpc/init.ts`:
   ```ts
   export const createTRPCContext = cache(async () => {
     const session = await auth.api.getSession({ headers: await headers() });
     return { userId: session?.user.id };
   });
   ```
   The `userId` is threaded into every tRPC call. The **`protectedProcedure`** middleware throws
   `TRPCError UNAUTHORIZED` when there's no `userId`, so every agents/meetings/dashboard procedure is
   gated.

3. **Ownership scoping** — even when authenticated, every query/mutation filters on
   `eq(<table>.userId, ctx.userId)`, so users can only see/modify their own data.

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

## 6. Key flows

### 6.1 Create an agent → schedule a meeting → run a call
1. Sign in (email/password or OAuth).
2. **Agents → New Agent** → name + instruction → `agents.create` (stores system prompt, logs activity).
3. **Meetings → New Meeting** → name, pick agent, optional instructions → `meetings.create` (status `scheduled`, logs activity).
4. **Start Meeting** on the meeting detail page → `/call/[meetingId]`.
5. `StreamCallProvider` → `meetings.getToken` (Stream JWT) + `meetings.getOne` + `meetings.createCall` → Stream call created (`recording: 720p`, `transcription: available`); meeting becomes `ongoing`.
6. In the call: user presses **Push to Talk** → SpeechRecognition → `/api/chat` (Mistral, agent instruction as system prompt) → reply spoken + saved to `conversation_messages` + logged to `voice_interactions`.

### 6.2 End a call → summary generated
- User clicks **Leave** in `CallControls` → `window.speechSynthesis.cancel()` → `endCall` mutation:
  - Marks meeting `completed`, sets `endedAt`, logs `meeting_completed` activity.
  - Fetches recording/transcription URLs from Stream (best‑effort, non‑blocking).
  - Calls `generateMeetingSummary(id)` (fire‑and‑forget).
- Alternatively (or additionally) the **Stream webhook** `call.session_ended` performs the same
  status update + summary trigger. Both are **idempotent**, so the first one to run wins.
- The meeting detail page polls every 5 s until `summary` appears, then renders it under
  "AI‑Generated Mission Summary" alongside "Watch Recording" / "Raw Transcript" buttons.

### 6.3 Voice interaction metrics
- After each user→AI exchange, the client estimates response time (`performance.now()`) and a
  speaking duration (word count ÷ 2.5 wps) and calls `logVoiceInteraction`.
- `voice_interactions` rows feed the dashboard's **Voice Interactions** metric (accuracy hard‑coded
  to `"95"` — a placeholder; see §8).

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
│   │   ├── meeting-summary.ts       # Mistral summarizer
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
├── drizzle/                         # migrations (note: stale — see §8)
├── bridge-server/                   # empty (legacy WebSocket bridge, removed)
├── scripts/drop_type.mjs
├── .env                             # runtime secrets (local)
├── drizzle.config.ts
├── next.config.ts                   # allowedDevOrigins (ngrok)
└── FEATURES.md                      # ← this file
```

---

## 8. Notes & discrepancies found while reading the code

> These are things worth knowing that aren't obvious from the README.

1. **LLM provider is currently Mistral only.** `AI_SETUP.md` and the README describe a
   provider‑agnostic backend (OpenRouter / Gemini / Groq). The **actual** code (`/api/chat` and
   `meeting-summary.ts`) only talks to `api.mistral.ai` using `MISTRAL_API_KEY` and `MODEL_NAME`
   (`.env` sets `MODEL_NAME=mistral-small-latest`). No OpenRouter/Gemini/Groq keys are present in
   `.env`.

2. **Stale migration.** `drizzle/0000_orange_ink.sql` contains an old example `users` table
   (`id` integer identity, `name`, `age`, `email`) that **does not match** the current schema
   (`src/db/schema.ts`). The app relies on `npm run db:push` (drizzle‑kit push) rather than
   applying this migration, so it's effectively dead weight.

3. **Route protection is inconsistent at the page level.** Only the dashboard home page
   (`(dashboard)/page.tsx`) does a server‑side `getSession` + redirect. The meetings/agents pages
   rely on tRPC `protectedProcedure` (which returns a UNAUTHORIZED error → the views render
   `ErrorState` rather than redirecting to sign‑in). Better‑Auth does not currently wrap the whole
   `(dashboard)` route group with a middleware guard.

4. **Placeholder / mock data:**
   - `voice_interactions.accuracy` is hard‑coded to `"95"` in `logVoiceInteraction`.
   - Recording **storage GB** is computed as `count * 0.45` (mock).
   - `getSystemHealth` returns real DB latency but simulated latency/status for Stream/OpenRouter/Gemini.
   - The **User menu** items (Profile, Billing, Security, Settings), **Forgot password**, and
     **Upgrade to Pro** are UI placeholders (no routes exist for `/settings`, `/upgrade`, etc.).

5. **`bridge-server/` is empty** — the legacy WebSocket Gemini bridge referenced in `AI_SETUP.md`
   was removed; only an empty directory remains.

6. **Two separate clients exist for tRPC**: a server‑side proxy (`trpc/server.tsx`, via
   `@trpc/tanstack-react-query`) and a client provider (`trpc/client.tsx`, via `@trpc/react-query`,
   `httpBatchLink` to `/api/trpc`). `useDashboard` and the modules use the **client** hooks
   (`trpc.xxx.useQuery`).

7. **Env / dev‑time setup.** The app is developed against a public **ngrok tunnel**
   (`broadways-disprove-embargo.ngrok-free.dev`): it's in `NEXT_PUBLIC_APP_URL`, `trustedOrigins`,
   `next.config.ts` `allowedDevOrigins`, and is what lets the Stream webhook reach the dev server.
   `BETTER_AUTH_URL` is currently `http://localhost:3000`.
