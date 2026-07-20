# Nexa AI — Project Architecture Document

> **Prepared by:** Kiro AI (acting as Project Manager)
> **Date:** July 2, 2026
> **Version:** 1.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Concept & Vision](#2-core-concept--vision)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture Diagram](#4-system-architecture-diagram)
5. [Database Schema](#5-database-schema)
6. [Feature Breakdown](#6-feature-breakdown)
7. [Module Structure](#7-module-structure)
8. [Page & Route Map](#8-page--route-map)
9. [API Layer](#9-api-layer)
10. [Authentication Flow](#10-authentication-flow)
11. [Voice AI Architecture](#11-voice-ai-architecture)
12. [Video Call Architecture](#12-video-call-architecture)
13. [Dashboard & Analytics](#13-dashboard--analytics)
14. [Third-Party Integrations](#14-third-party-integrations)
15. [Environment Configuration](#15-environment-configuration)
16. [Known Gaps & Incomplete Features](#16-known-gaps--incomplete-features)
17. [Deployment](#17-deployment)

---

## 1. Project Overview

**Nexa AI** is a full-stack SaaS web application that combines real-time video
conferencing with a provider-agnostic AI voice assistant. The platform allows
users to create custom AI "agents" (each with a unique persona and instruction
set), schedule meetings attached to those agents, join live video calls, and
interact with the AI in real time using voice — all from a single interface.

The project is built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**,
**Drizzle ORM** on **Neon PostgreSQL**, **tRPC**, **Better-Auth**, and the
**Stream Video React SDK**.

**Internal brand language** used throughout the UI:
- Agents are called **"Operatives"**
- Meetings are called **"Relay Sessions"**
- The dashboard is referred to as **"Mission Control"**
- Active calls show a **"Live Relay"** indicator

---

## 2. Core Concept & Vision

The product sits at the intersection of three domains:

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│  Video Meeting  │ +  │  Custom AI Agent │ +  │  Voice Interaction │
│  (Stream Video) │    │  (LLM-Powered)   │    │  (Browser Native)  │
└─────────────────┘    └──────────────────┘    └────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Nexa AI SaaS  │
                    │  Mission Control│
                    └─────────────────┘
```

A user defines an AI agent by giving it a **name** and an **instruction** (system
prompt). They then schedule a **meeting** tied to that agent. When the meeting
starts, they join a live video call and can interact with the agent by pressing a
"Push to Talk" button — the AI understands the context of the agent's instruction
and responds in both text and synthesized speech.

---

## 3. Tech Stack

| Category | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.6 |
| **Runtime** | React | 19.2.4 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS v4 + tailwind-merge + clsx | ^4 |
| **UI Components** | shadcn/ui (base-nova style, 55 primitives) | ^4.7.0 |
| **Icons** | lucide-react + react-icons | ^1.16 / ^5.6 |
| **Animation** | Framer Motion | ^12 |
| **Charts** | ApexCharts via react-apexcharts | ^5.14 / ^2.1 |
| **RPC** | tRPC v11 (client + server + react-query adapter) | ^11 |
| **Data Fetching** | TanStack Query | ^5 |
| **Tables** | TanStack Table | ^8 |
| **Forms** | React Hook Form + Zod + @hookform/resolvers | ^7 / ^4 |
| **Auth** | Better-Auth (email/pass + GitHub + Google OAuth) | ^1.6.11 |
| **ORM** | Drizzle ORM (postgresql dialect) | ^0.45.2 |
| **Database** | Neon PostgreSQL (serverless) | ^1.1.0 |
| **Migrations** | drizzle-kit | ^0.31.10 |
| **Video SDK** | Stream Video React SDK | ^1.37.0 |
| **Stream Node SDK** | @stream-io/node-sdk | ^0.7.58 |
| **AI Providers** | OpenRouter / Google Gemini / Groq (HTTP fetch) | — |
| **Avatars** | DiceBear (bottts, initials, lorelei) | ^9.4.2 |
| **ID Generation** | nanoid | ^5 |
| **Date Utilities** | date-fns | ^4.1.0 |
| **Notifications** | Sonner | ^2 |
| **Serialization** | SuperJSON | ^2 |
| **Fonts** | next/font: Geist Sans + Geist Mono | — |

---

## 4. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                     │
│  ┌────────────┐  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │ React 19   │  │ Stream Video SDK │  │  Browser Voice APIs     │ │
│  │ (Next.js   │  │ (Video Calls,    │  │  SpeechRecognition (STT)│ │
│  │ App Router)│  │  SpeakerLayout,  │  │  speechSynthesis (TTS)  │ │
│  │            │  │  CallControls)   │  │                         │ │
│  └─────┬──────┘  └────────┬─────────┘  └───────────┬─────────────┘ │
│        │                  │                         │               │
│        │  tRPC + TanStack │                         │  text payload │
└────────┼──────────────────┼─────────────────────────┼───────────────┘
         │                  │                         │
         ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js Server (Edge/Node)                      │
│                                                                     │
│  ┌─────────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  tRPC Router        │  │  /api/chat   │  │ /api/webhooks   │   │
│  │  agents.*           │  │  LLM Proxy   │  │ /stream         │   │
│  │  meetings.*         │  │  (OpenRouter │  │ (session start/ │   │
│  │  hello              │  │  /Gemini     │  │  end events)    │   │
│  │  getDashboardData   │  │  /Groq)      │  │                 │   │
│  │  getSystemHealth    │  │              │  │                 │   │
│  └──────────┬──────────┘  └──────┬───────┘  └────────┬────────┘   │
│             │                    │                    │             │
│  ┌──────────▼────────────────────▼────────────────────▼──────────┐ │
│  │                  Better-Auth + Drizzle ORM                    │ │
│  └──────────────────────────────┬────────────────────────────────┘ │
└─────────────────────────────────┼──────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐   ┌────────────────────┐   ┌─────────────────────┐
│  Neon Postgres  │   │  Stream Video API  │   │  AI Provider APIs   │
│  (Primary DB)   │   │  (Calls, Tokens,   │   │  OpenRouter (def.)  │
│                 │   │  Recordings,       │   │  Google Gemini      │
│  users          │   │  Transcriptions,   │   │  Groq               │
│  agents         │   │  Webhooks)         │   │                     │
│  meetings       │   │                    │   │                     │
│  activities     │   └────────────────────┘   └─────────────────────┘
│  voiceInteract. │
│  sessions       │
│  accounts       │
│  verification   │
└─────────────────┘
```

---

## 5. Database Schema

All tables are defined in `src/db/schema.ts` using Drizzle ORM and pushed to
Neon PostgreSQL via `npm run db:push`. All primary keys use `nanoid()` (text)
except the Better-Auth managed tables.

### Entity Relationship Overview

```
user ◄──────┬──── session (userId FK)
            ├──── account (userId FK)
            ├──── verification (identifier)
            ├──── agents (userId FK)
            ├──── meetings (userId FK)
            ├──── activities (userId FK)
            └──── voiceInteractions (userId FK)

agents ◄────┬──── meetings (agentId FK)
            └──── voiceInteractions (via meetings)

meetings ◄──└──── voiceInteractions (meetingId FK)
```

### Table Definitions

#### `user`
| Column | Type | Notes |
|---|---|---|
| id | text PK | Better-Auth managed |
| name | text | required |
| email | text | unique, required |
| emailVerified | boolean | default false |
| image | text | avatar URL (optional) |
| createdAt / updatedAt | timestamp | auto-managed |

#### `session`
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| expiresAt | timestamp | |
| token | text | unique |
| ipAddress / userAgent | text | |
| userId | text FK → user | CASCADE, indexed |

#### `account`
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| accountId | text | OAuth provider user ID |
| providerId | text | e.g. "github", "google", "credential" |
| userId | text FK → user | CASCADE, indexed |
| accessToken / refreshToken / idToken | text | OAuth tokens |
| password | text | hashed (email/pass auth) |

#### `verification`
| Column | Type | Notes |
|---|---|---|
| id | text PK | |
| identifier | text | indexed |
| value | text | |
| expiresAt | timestamp | |

#### `agents`
| Column | Type | Notes |
|---|---|---|
| id | text PK | nanoid() |
| name | text | required |
| userId | text FK → user | CASCADE, indexed |
| instruction | text | LLM system prompt |
| createdAt / updatedAt | timestamp | auto-managed |

#### `meetings`
| Column | Type | Notes |
|---|---|---|
| id | text PK | nanoid() — also used as Stream call ID |
| name | text | required |
| userId | text FK → user | CASCADE, indexed |
| agentId | text FK → agents | CASCADE |
| instructions | text | optional override instructions |
| status | enum | `scheduled \| ongoing \| completed \| failed \| cancelled \| processing` |
| startedAt / endedAt | timestamp | lifecycle timestamps |
| transcriptUrl | text | Stream transcription URL |
| summary | text | AI-generated summary (not yet populated) |
| recordingUrl | text | Stream recording URL |
| createdAt / updatedAt | timestamp | auto-managed |

#### `activities`
| Column | Type | Notes |
|---|---|---|
| id | text PK | nanoid() |
| userId | text FK → user | CASCADE, indexed |
| type | enum | `meeting_created \| meeting_started \| meeting_completed \| agent_created \| agent_updated \| agent_deleted \| recording_ready \| transcription_done` |
| title | text | human-readable title |
| description | text | optional detail |
| metadata | text | JSON string for extra data |
| createdAt | timestamp | auto-managed |

#### `voiceInteractions`
| Column | Type | Notes |
|---|---|---|
| id | text PK | nanoid() |
| userId | text FK → user | CASCADE, indexed |
| meetingId | text FK → meetings | CASCADE |
| duration | text | in seconds |
| accuracy | text | accuracy score |
| responseTime | text | in milliseconds |
| createdAt | timestamp | auto-managed |

---

## 6. Feature Breakdown

### 6.1 Authentication

- Email/password sign-up and sign-in
- GitHub OAuth social login
- Google OAuth social login
- Session-based auth with server-side guards on every protected page
- Sign-out from command palette or user dropdown in header/sidebar
- DiceBear-generated avatar (bottts style, seeded by email) shown in header and sidebar
- All auth is handled by **Better-Auth** with a Drizzle adapter writing to Neon

### 6.2 AI Agents (CRUD)

- Create a new agent with a **name** and **instruction** (system prompt)
- Live DiceBear bot-avatar preview while typing the agent name
- Edit name or instruction at any time
- Delete an agent (cascades to meetings)
- Paginated, searchable list (search by name or instruction text)
- Agent detail page shows: ID, instruction preview, meeting count, created date
- Every create/update/delete action logs to the `activities` table

### 6.3 Meetings (CRUD)

- Schedule a meeting: name, assigned agent, optional instructions
- Meeting lifecycle: `scheduled → ongoing → completed / failed / cancelled / processing`
- Duration is computed server-side via SQL `EXTRACT EPOCH`
- List with search by name, filter by status, filter by agent
- Meeting detail page shows: status badge, agent name, duration, recording link, transcript link, AI summary field
- Stream Video recording (720p) and transcription enabled on every call
- Every create, start, and completion logs to the `activities` table

### 6.4 Video Calls (Stream Video)

- Pre-call **Lobby**: camera/mic preview with toggles, mic/cam status indicators
- Joining state: fullscreen overlay with animated avatar and "Establishing secure connection…" message
- **Active call**: Stream `SpeakerLayout` + `CallControls` on white theme
- "Live Relay" animated indicator in top-left corner
- Post-call **Ended** screen: "Mission Completed" with links back to dashboard/meetings
- Call state machine: `IDLE → JOINED → LEFT` (with loading states for in-between)

### 6.5 Voice AI Assistant (In-Call)

- Slide-in sidebar panel during active calls, collapsible
- **Push to Talk** button → browser `SpeechRecognition` captures voice → text sent to `/api/chat`
- LLM (OpenRouter / Gemini / Groq) responds using the agent's instruction as system prompt
- Response text is fed to browser `speechSynthesis` and spoken back to the user
- Scrollable conversation history with user (green bubbles) and AI (gray bubbles) messages
- Listening and processing state indicators

### 6.6 Dashboard & Analytics

- Personalized greeting with user's name
- **Metric cards** with sparklines (ApexCharts):
  - Total Meetings (with week-over-week trend %)
  - Active AI Agents
  - Voice Interactions (from `voiceInteractions` table)
  - Recording Storage (estimated at 450MB/recording)
- **Analytics chart** — tabbed: Meeting Activity (area chart) + Avg Meeting Duration (line chart) over last 7 days
- **Upcoming meetings** grid (next 5 scheduled meetings)
- **AI Insights** — rule-based observations derived from live metrics
- **Activity timeline** — last 10 activities with per-type icons and Framer Motion scroll animations
- **System status monitor** — real DB latency, mocked status for other services
- **Quick action cards** — shortcuts to create agent / schedule meeting

### 6.7 Command Palette (⌘K)

- Opens with `Ctrl+K` / `⌘K` or clicking the search bar in the navbar
- Navigate to: Dashboard, Meetings, AI Agents
- Actions: New Meeting, Upgrade to Pro
- Settings: Profile, Billing, Security, Account Settings
- Help: Documentation link, Sign Out
- Custom `ShortcutsModal` component (not cmdk-based, custom-built)

### 6.8 Recordings & Transcriptions

- Stream Video automatically records calls at 720p when enabled
- `meetings.getRecordings` and `meetings.getTranscriptions` tRPC queries fetch live from Stream
- Meeting detail page shows "Watch Recording" and "Raw Transcript" buttons
- `recordingUrl` and `transcriptUrl` fields exist on the meeting row (not yet auto-populated)

### 6.9 Webhook Processing

- `POST /api/webhooks/stream` receives Stream Video events
- `call.session_started` → updates meeting status to `ongoing`, sets `startedAt`
- `call.session_ended` → updates meeting status to `completed`, sets `endedAt`
- Signature header is read but verification is stubbed (`valid = true`)

---

## 7. Module Structure

The project follows a **feature-module pattern** where each domain co-locates
its server procedures (tRPC), UI views, and UI components together.

```
src/
│
├── app/                          Next.js App Router (routing layer only)
│   ├── layout.tsx                Root: TRPCReactProvider + Geist fonts + Sonner Toaster
│   ├── globals.css               Tailwind v4 @import
│   │
│   ├── (auth)/                   Unauthenticated layout (centered, no sidebar)
│   │   ├── layout.tsx
│   │   ├── sign-in/page.tsx      → renders modules/auth/ui/views/sign-in-view
│   │   └── sign-up/page.tsx      → renders modules/auth/ui/views/sign-up-view
│   │
│   ├── (dashboard)/              Authenticated layout (sidebar + navbar)
│   │   ├── layout.tsx            SidebarProvider + DashboardSidebar + DashboardNavbar + ShortcutsModal
│   │   ├── page.tsx              / → HomeView (session guard)
│   │   ├── agents/
│   │   │   ├── page.tsx          /agents → AgentsView (SSR prefetch)
│   │   │   ├── hooks/use-agents-filter.ts   URL ↔ search/page state
│   │   │   └── [agentId]/page.tsx  /agents/:id → AgentIdView
│   │   └── meetings/
│   │       ├── page.tsx          /meetings → MeetingsView (SSR prefetch)
│   │       ├── hooks/use-meetings-filter.ts  URL ↔ search/status/agent filters
│   │       └── [meetingId]/page.tsx  /meetings/:id → MeetingIdView
│   │
│   ├── api/
│   │   ├── auth/[...all]/route.ts    Better-Auth handler (all auth endpoints)
│   │   ├── chat/route.ts             LLM proxy (OpenRouter / Gemini / Groq)
│   │   ├── trpc/[trpc]/route.ts      tRPC fetch adapter
│   │   └── webhooks/stream/route.ts  Stream Video webhook handler
│   │
│   └── call/
│       ├── layout.tsx                Minimal layout (no sidebar)
│       ├── [meetingId]/page.tsx      /call/:id → CallView
│       └── ui/components/
│           ├── call-provider.tsx     StreamVideo + StreamCall context setup
│           ├── call-ui.tsx           State machine: IDLE→JOINED→LEFT
│           ├── call-lobby.tsx        Pre-call camera/mic preview
│           ├── call-active.tsx       SpeakerLayout + VoiceAssistant + CallControls
│           ├── call-ended.tsx        Post-call "Mission Completed" screen
│           ├── call-connect.tsx      Joining/reconnecting overlay
│           └── voice-assistant.tsx   Slide-in AI chat + Push to Talk panel
│
├── components/
│   ├── generated-avatar.tsx      DiceBear avatar (bottts / initials / lorelei)
│   ├── loading-state.tsx         Centered spinner with label
│   ├── error-state.tsx           Centered error message
│   ├── responsive-dialog.tsx     (empty — not implemented)
│   └── ui/                       55 shadcn/ui primitives (accordion, button, dialog, etc.)
│
├── db/
│   ├── schema.ts                 All Drizzle table definitions + relations
│   ├── index.ts                  drizzle(DATABASE_URL) client export
│   └── list_tables.ts            Dev utility (list DB tables)
│
├── hooks/
│   ├── use-voice-assistant.ts    SpeechRecognition → /api/chat → speechSynthesis
│   ├── useDashboard.ts           Centralised tRPC queries for HomeView
│   └── use-mobile.ts             768px breakpoint hook
│
├── lib/
│   ├── auth.ts                   betterAuth() config (server-only)
│   ├── auth-client.ts            createAuthClient() (client-only)
│   ├── stream-video.ts           StreamClient from @stream-io/node-sdk (server-only)
│   ├── avatar.tsx                generateAvatarUri() DiceBear helper
│   └── utils.ts                  cn() = twMerge + clsx
│
├── modules/                      Feature modules (co-located server + UI)
│   ├── agents/
│   │   ├── schemas.ts            agentsInsertSchema (Zod)
│   │   ├── server/procedures.ts  agentsRouter (tRPC): getMany, getOne, create, update, remove
│   │   └── ui/
│   │       ├── views/            agents-view.tsx, agent-id-view.tsx
│   │       └── components/       list-header, new-agent-dialog, edit-agent-dialog,
│   │                             data-table, columns, data-pagination
│   │
│   ├── meetings/
│   │   ├── schemas.ts            meetingsInsertSchema, meetingsUpdateSchema (Zod)
│   │   ├── server/procedures.ts  meetingsRouter (tRPC): getMany, getOne, create, update, remove,
│   │   │                         createCall, getToken, getSession, getRecordings, getTranscriptions
│   │   └── ui/
│   │       ├── views/            meetings-view.tsx, meeting-id-view.tsx, call-view.tsx
│   │       └── components/       list-header (search + filters), new-meeting-dialog
│   │
│   ├── auth/
│   │   └── ui/views/             sign-in-view.tsx, sign-up-view.tsx
│   │
│   └── home/
│       ├── server/procedures.ts  homeRouter: hello, getDashboardData, getSystemHealth
│       └── ui/
│           ├── views/            home-view.tsx
│           └── components/       hero-section, metric-card, analytics-chart,
│                                 activity-timeline, status-monitor,
│                                 quick-action-card, meeting-card, insight-card
│
├── trpc/
│   ├── init.ts                   initTRPC, createTRPCContext, protectedProcedure
│   ├── client.tsx                TRPCReactProvider + trpc client (SuperJSON transformer)
│   ├── server.tsx                createTRPCOptionsProxy for SSR prefetch
│   ├── query-client.ts           makeQueryClient (staleTime 30s, dehydration config)
│   └── routers/_app.ts           appRouter — wires all sub-routers together
│
└── constants.ts                  DEFAULT_PAGE=1, DEFAULT_PAGE_SIZE=2, MAX=100
```

---

## 8. Page & Route Map

| URL | Page File | View Component | Auth | Notes |
|---|---|---|---|---|
| `/sign-in` | `(auth)/sign-in/page.tsx` | `SignInView` | Redirects to `/` if authed | Email + GitHub + Google |
| `/sign-up` | `(auth)/sign-up/page.tsx` | `SignUpView` | Redirects to `/` if authed | Name + email + password |
| `/` | `(dashboard)/page.tsx` | `HomeView` | Required | Full dashboard |
| `/agents` | `(dashboard)/agents/page.tsx` | `AgentsView` | Required | Paginated, searchable list |
| `/agents/:id` | `(dashboard)/agents/[agentId]/page.tsx` | `AgentIdView` | Required | Detail + edit + delete |
| `/meetings` | `(dashboard)/meetings/page.tsx` | `MeetingsView` | Required | Filterable list |
| `/meetings/:id` | `(dashboard)/meetings/[meetingId]/page.tsx` | `MeetingIdView` | Required | Detail + media + join |
| `/call/:id` | `call/[meetingId]/page.tsx` | `CallView` | Required | Full-screen call UI |

---

## 9. API Layer

### REST Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...all]` | GET / POST | Better-Auth catch-all: sign-in, sign-up, sign-out, OAuth callbacks |
| `/api/chat` | POST | LLM proxy — receives `{ prompt, agentId }`, returns `{ response }` |
| `/api/webhooks/stream` | POST | Stream Video webhook handler (`call.session_started`, `call.session_ended`) |
| `/api/trpc/[trpc]` | GET / POST | tRPC fetch adapter for all procedures |

### tRPC Procedures

All procedures require authentication (`protectedProcedure`). The context
injects `userId` from the Better-Auth session.

#### `agents.*`
| Procedure | Type | Input | Description |
|---|---|---|---|
| `agents.getMany` | query | `{ page, pageSize, search? }` | Paginated list with meeting count |
| `agents.getOne` | query | `{ id }` | Single agent |
| `agents.create` | mutation | `{ name, instruction }` | Create + log activity |
| `agents.update` | mutation | `{ id, name?, instruction? }` | Update + log activity |
| `agents.remove` | mutation | `{ id }` | Delete + log activity |

#### `meetings.*`
| Procedure | Type | Input | Description |
|---|---|---|---|
| `meetings.getMany` | query | `{ page, pageSize, search?, status?, agentId? }` | Paginated list with agent join |
| `meetings.getOne` | query | `{ id }` | Full meeting detail with media fields |
| `meetings.create` | mutation | meetingsInsertSchema | Create + log activity |
| `meetings.update` | mutation | meetingsUpdateSchema | Update + log completion activity |
| `meetings.remove` | mutation | `{ id }` | Delete meeting |
| `meetings.createCall` | mutation | `{ id }` | Create Stream call, enable recording + transcription |
| `meetings.getToken` | query | — | Generate Stream user token (1hr expiry) |
| `meetings.getSession` | query | — | Return current Better-Auth session |
| `meetings.getRecordings` | query | `{ id }` | Fetch recording list from Stream |
| `meetings.getTranscriptions` | query | `{ id }` | Fetch transcription list from Stream |

#### `home.*`
| Procedure | Type | Input | Description |
|---|---|---|---|
| `hello` | query | `{ text }` | Returns personalized greeting + user data |
| `getDashboardData` | query | — | Full KPI metrics, chart data, upcoming meetings, recent activities |
| `getSystemHealth` | query | — | Real DB latency + mocked service statuses |

### `/api/chat` — LLM Proxy Logic

```
Request: POST /api/chat
Body: { prompt: string, agentId: string }

1. Fetch agent.instruction from DB where id = agentId
2. Select provider from process.env.AI_PROVIDER (default: "openrouter")
3. Build messages array: [{ role: "system", content: agent.instruction }, { role: "user", content: prompt }]
4. POST to selected provider API
5. Return: { response: string }

Supported providers:
  - "openrouter" → https://openrouter.ai/api/v1/chat/completions
  - "gemini"     → https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
  - "groq"       → https://api.groq.com/openai/v1/chat/completions
```

---

## 10. Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Sign Up / Sign In                        │
│                                                                 │
│  Email + Password              GitHub / Google OAuth            │
│         │                              │                        │
│         ▼                              ▼                        │
│   authClient.signUp             authClient.signIn.social()      │
│   authClient.signIn             → /api/auth/[...all]            │
│         │                        OAuth callback                 │
│         └──────────────┬──────────────┘                        │
│                         ▼                                       │
│              Better-Auth writes to Neon:                        │
│              - user record (upserted for OAuth)                 │
│              - account record (with providerId)                 │
│              - session record (with token)                      │
│                         │                                       │
│                         ▼                                       │
│              Session cookie set in browser                      │
│              → redirect to /                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Server-Side Auth Guard                        │
│                                                                 │
│  Every protected page (server component):                       │
│    const session = await auth.api.getSession({ headers })       │
│    if (!session) redirect('/sign-in')                           │
│                                                                 │
│  Auth pages (sign-in / sign-up):                                │
│    if (session) redirect('/')                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    tRPC Auth Context                             │
│                                                                 │
│  createTRPCContext() → auth.api.getSession() → { userId }       │
│  protectedProcedure → throws UNAUTHORIZED if !userId            │
│  All queries/mutations receive ctx.userId automatically         │
└─────────────────────────────────────────────────────────────────┘

Trusted origins: https://broadways-disprove-embargo.ngrok-free.dev
(ngrok dev tunnel — configured in better-auth + next.config.ts)
```

---

## 11. Voice AI Architecture

This is the core differentiating feature of Nexa AI. All voice processing
happens **in the browser** — no audio data leaves the client.

```
┌──────────────────────────────────────────────────────────────────┐
│                     In-Call Voice Assistant                      │
│                                                                  │
│  User presses "Push to Talk"                                     │
│           │                                                      │
│           ▼                                                      │
│  window.SpeechRecognition.start()                                │
│  (continuous: false, lang: 'en-US')                              │
│           │                                                      │
│           ▼  onresult event                                      │
│  transcript = event.results[0][0].transcript                     │
│           │                                                      │
│           ▼                                                      │
│  POST /api/chat                                                  │
│  body: { prompt: transcript, agentId: meeting.agentId }          │
│           │                                                      │
│           ▼ (server-side)                                        │
│  Fetch agent.instruction from DB                                 │
│  Build: system = agent.instruction, user = transcript            │
│  Call AI provider API (OpenRouter / Gemini / Groq)               │
│           │                                                      │
│           ▼                                                      │
│  { response: "AI reply text" }                                   │
│           │                                                      │
│           ▼                                                      │
│  window.speechSynthesis.speak(response)                          │
│  (prefers Google/Female voice, falls back to voices[0])          │
│           │                                                      │
│           ▼                                                      │
│  Conversation history updated in component state                 │
│  (not persisted to DB currently)                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Key implementation files:**
- `src/hooks/use-voice-assistant.ts` — all STT/TTS logic + API call
- `src/app/call/ui/components/voice-assistant.tsx` — UI panel, uses the hook
- `src/app/api/chat/route.ts` — server-side LLM proxy

**Provider switching** — controlled entirely by env vars, no code change needed:
```
AI_PROVIDER=openrouter   MODEL_NAME=deepseek/deepseek-v4-flash:free
AI_PROVIDER=gemini       MODEL_NAME=gemini-1.5-flash
AI_PROVIDER=groq         MODEL_NAME=llama-3.3-70b-versatile
```

---

## 12. Video Call Architecture

```
/call/:meetingId
       │
       ▼
CallView
       │
       ▼
StreamCallProvider (call-provider.tsx)
  ├── trpc.meetings.getToken.useQuery()       → Stream user token (1hr)
  ├── trpc.meetings.getSession.useQuery()     → User identity
  ├── trpc.meetings.getOne.useQuery()         → Meeting data
  ├── trpc.meetings.createCall.useMutation()  → Creates/gets Stream call
  │     └── Enables: recording (720p) + transcription
  ├── StreamVideoClient.getOrCreateInstance() → Video client
  ├── videoClient.call('default', meetingId)  → Call object
  └── Wraps children in <StreamVideo> + <StreamCall> + <StreamTheme>
       │
       ▼
CallConnect (joining overlay — shown during JOINING state)
       │
       ▼
CallUI (state machine based on CallingState)
  ├── IDLE  → CallLobby
  │             ├── VideoPreview
  │             ├── Mic/Cam toggle buttons
  │             └── "Join Mission Room" button → call.join()
  │
  ├── JOINED → CallActive
  │              ├── SpeakerLayout (Stream)
  │              ├── VoiceAssistant (slide-in panel)
  │              ├── CallControls → onLeave: call.leave()
  │              └── "Live Relay" indicator
  │
  └── LEFT → CallEnded
               ├── "Mission Completed" message
               └── Links back to /meetings and /

Stream Webhook → /api/webhooks/stream
  ├── call.session_started → meeting status = "ongoing", startedAt = now
  └── call.session_ended   → meeting status = "completed", endedAt = now
```

**Meeting ID = Stream Call ID.** The `nanoid()` generated `meetings.id` is
passed directly as the Stream call ID, linking the two systems.

---

## 13. Dashboard & Analytics

The home dashboard (`/`) is driven by the `useDashboard` hook which makes
three parallel tRPC queries:

| Query | Refetch Interval | Stale Time | Data |
|---|---|---|---|
| `hello` | — | 30s | User name for greeting |
| `getDashboardData` | 10s | 5s | All metrics, charts, activities, upcoming |
| `getSystemHealth` | 30s | 15s | Service status + DB latency |

### Metric Cards (with ApexCharts sparklines)

| Card | Source | Trend |
|---|---|---|
| Total Meetings | `meetingsStats.total` | Week-over-week vs. prev 7 days |
| Active AI Agents | `agentsStats.total` | — |
| Voice Conversations | `voiceStats.totalCalls` | — |
| Recording Storage | `recordingStats.total × 0.45 GB` | Estimated |

### Chart Data

7-day meeting activity is computed via a raw SQL query:
```sql
SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
FROM meetings
WHERE user_id = $userId AND created_at >= $sevenDaysAgo
GROUP BY date ORDER BY date ASC
```

### System Health

| Service | Latency Source |
|---|---|
| Neon Database | Real — timed via `Date.now()` before/after query |
| Stream Video API | Mocked: "42ms" |
| OpenRouter API | Mocked: "156ms" |
| Gemini Model | Mocked: "210ms" |

---

## 14. Third-Party Integrations

| Service | Usage | Auth Method |
|---|---|---|
| **Neon PostgreSQL** | Primary database (serverless Postgres) | `DATABASE_URL` connection string |
| **Stream Video** | Real-time video calls, recording, transcription, webhooks | `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` + `STREAM_VIDEO_SECRET_KEY` |
| **Better-Auth** | Authentication framework (email/password + OAuth) | `BETTER_AUTH_SECRET` |
| **GitHub OAuth** | Social sign-in | `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` |
| **Google OAuth** | Social sign-in | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| **OpenRouter** | LLM API aggregator (default AI provider) | `OPENROUTER_API_KEY` |
| **Google Gemini** | Alternative LLM provider | `GEMINI_API_KEY` |
| **Groq** | Alternative LLM provider (fast inference) | `GROQ_API_KEY` |
| **DiceBear** | Avatar generation (bottts, initials, lorelei styles) | No auth — local computation |
| **ngrok** | Dev tunnel for webhooks + OAuth callbacks | `broadways-disprove-embargo.ngrok-free.dev` |
| **Vercel** | Deployment target | Project env vars |

---

## 15. Environment Configuration

All secrets are managed via `.env` at the project root. Below is a reference of
all expected variables:

```env
# ── Database ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://<user>:<pass>@<host>/neondb

# ── Authentication ────────────────────────────────────────────────
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── OAuth ─────────────────────────────────────────────────────────
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Stream Video ──────────────────────────────────────────────────
NEXT_PUBLIC_STREAM_VIDEO_API_KEY=
STREAM_VIDEO_SECRET_KEY=

# ── AI Provider (choose one) ──────────────────────────────────────
AI_PROVIDER=openrouter        # options: openrouter | gemini | groq
MODEL_NAME=deepseek/deepseek-v4-flash:free

OPENROUTER_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

### Key Config Files

| File | Purpose |
|---|---|
| `next.config.ts` | `allowedDevOrigins` for ngrok tunnel |
| `drizzle.config.ts` | Schema path, dialect, DB URL for drizzle-kit |
| `components.json` | shadcn/ui config: style=base-nova, baseColor=neutral |
| `postcss.config.js` | Tailwind v4 PostCSS integration |
| `eslint.config.mjs` | ESLint 9 flat config (nextVitals + nextTs) |
| `package.json` | App name: "metaai", scripts, all dependencies |

### npm Scripts

| Script | Command |
|---|---|
| `dev` | `cross-env NODE_OPTIONS=--max-old-space-size=4096 next dev --webpack` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `db:push` | `drizzle-kit push` — sync schema to DB |
| `db:studio` | `drizzle-kit studio --port 4984` — visual DB browser |

---

## 16. Known Gaps & Incomplete Features

These are features that are scaffolded or partially built but not yet complete.
This section is critical for any developer picking up the project.

### High Priority

| # | Feature | Location | Issue |
|---|---|---|---|
| 1 | **Webhook signature verification** | `api/webhooks/stream/route.ts` | `valid = true` hardcoded — no HMAC check. Security risk in production. |
| 2 | **AI Meeting Summary** | `meetings.summary` DB field | Field exists and is displayed, but nothing generates or writes to it. Always shows "Summary Pending." |
| 3 | **Recording/Transcript URL persistence** | `meetingsRouter.getRecordings` | Fetches from Stream live but never writes `recordingUrl`/`transcriptUrl` back to DB. |
| 4 | **voiceInteractions not written** | `voiceInteractions` table | Table and DB queries exist for dashboard metrics, but nothing inserts rows during calls. Voice stats will always be 0. |

### Medium Priority

| # | Feature | Location | Issue |
|---|---|---|---|
| 5 | **Settings pages** | `/settings`, `/settings?tab=*` | Routes referenced in command palette and user dropdown but pages do not exist. |
| 6 | **Upgrade / Billing page** | `/upgrade` | Linked from command palette with "Pro" badge. Page does not exist. |
| 7 | **"Start Meeting" button** | `AgentIdView` | Button renders but has no `onClick` or `href`. Non-functional. |
| 8 | **"Calendar View" button** | `MeetingsListHeader` | Button renders but has no handler. Non-functional. |
| 9 | **"Feedback" button** | `DashboardNavbar` | Button renders but has no action. Non-functional. |
| 10 | **New Meeting from Command Palette** | `ShortcutsModal` | Fires `toast.info("New meeting coming soon!")` — not wired to `NewMeetingDialog`. |

### Low Priority / Tech Debt

| # | Item | Location | Issue |
|---|---|---|---|
| 11 | `responsive-dialog.tsx` | `src/components/` | File is completely empty. |
| 12 | `call/ui/views/` directory | `src/app/call/ui/views/` | Empty directory — views were moved to components or never created. |
| 13 | `DashboardHeader` component | `dashboard-header.tsx` | Exists as a file but is never used. Layout uses `DashboardNavbar` instead. |
| 14 | `DashboardCommand` component | `dashboard-command.tsx` | Full custom command implementation that is superseded by `ShortcutsModal`. Dead code. |
| 15 | `DEFAULT_PAGE_SIZE = 2` | `src/constants.ts` | Pagination shows only 2 items per page — clearly a dev placeholder, not production value. |
| 16 | `data-fns` dependency | `package.json` | Listed alongside `date-fns`. Likely a typo for a non-existent package. |
| 17 | `@stream-io/openai-realtime-api` | `package.json` | Installed but completely unused. Leftover from previous architecture. |
| 18 | `OPENAI_API_KEY` in `.env` | `.env` | Key present but no OpenAI provider is configured in `/api/chat`. Dead config. |
| 19 | Drizzle migration history | `drizzle/` folder | `drizzle/0000_orange_ink.sql` reflects an old stub schema, not the real tables. Migration history is broken — schema managed via `db:push` only. |
| 20 | System health — mocked services | `homeRouter.getSystemHealth` | Stream, OpenRouter, and Gemini latencies are hardcoded strings, not real health checks. |

---

## 17. Deployment

**Target platform:** Vercel

**Steps:**
1. Push code to GitHub
2. Connect repo to Vercel project
3. Set all environment variables from Section 15 in Vercel dashboard
4. Run `npm run db:push` against the production Neon database to sync the schema
5. Deploy — Vercel auto-builds via `next build`

**Webhook setup for Stream Video:**
1. In Stream Video dashboard, add a webhook pointing to:
   `https://<your-domain>/api/webhooks/stream`
2. Subscribe to: `call.session_started`, `call.session_ended`
3. **Implement webhook signature verification** before going to production (see Gap #1)

**OAuth callback URLs to register:**
- GitHub: `https://<your-domain>/api/auth/callback/github`
- Google: `https://<your-domain>/api/auth/callback/google`

---

*This document was generated by reading every source file in the project.
Last updated: July 2, 2026.*
