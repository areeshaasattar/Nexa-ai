# Nexa AI

## Overview

Nexa AI is a Next.js‑based platform that combines real‑time video conferencing with an AI voice assistant. Users can create custom AI "agents", schedule meetings, and interact with the assistant via speech‑to‑text and text‑to‑speech in the browser. The AI backend is the **Mistral API** (`api.mistral.ai`), and data is stored in a Neon PostgreSQL database through Drizzle ORM.

## Key Features

- **Custom AI agents** – define name & instruction, stored per user.
- **Video calls** – powered by Stream Video SDK with automatic token generation.
- **Voice interaction** – browser native SpeechRecognition + SpeechSynthesis.
- **AI chat & summaries** – Mistral-powered `/api/chat` for the voice assistant and automatic meeting summaries.
- **Secure authentication** – Better‑Auth with email/password + GitHub & Google OAuth, email verification, forgot/reset password, and account settings.
- **Settings & account** – profile (name, bio, avatar, email change), security (password change), billing (UI-only), account details.
- **Dashboard** – manage agents, schedule meetings, view meeting status, recordings, transcriptions.
- **Database** – Drizzle ORM + Neon (PostgreSQL) with `db:push`.
- **TypeScript + TailwindCSS** – fully typed, modern UI via shadcn/ui components.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| API / RPC | tRPC, Next.js API routes |
| Auth | Better‑Auth, GitHub/Google OAuth |
| AI backend | Mistral (`api.mistral.ai`), model configurable via `MODEL_NAME` |
| Video | Stream Video React SDK |
| Database | Neon PostgreSQL, Drizzle‑ORM (postgresql dialect) |
| Migrations | drizzle‑kit |
| CI / Dev | ESLint, TypeScript, npm scripts |

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 (LTS) and **npm** (or yarn/pnpm/bun)
- A **Neon** project with a PostgreSQL connection string
- **Stream Video** API keys (`NEXT_PUBLIC_STREAM_VIDEO_API_KEY` & `STREAM_VIDEO_SECRET_KEY`)
- **A Mistral API key** (`MISTRAL_API_KEY`) — the model is configurable via `MODEL_NAME` (default `mistral-small-latest`)
- GitHub/Google OAuth credentials if you want social login (see `.env` section)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/nexa-ai.git
cd nexa-ai

# Install dependencies
npm install   # or yarn / pnpm / bun

# Copy the example env file (create one if missing)
cp .env.example .env
```

### Environment variables

Create a `.env` file at the project root and fill the values according to the table below.

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon Postgres connection string | `postgresql://user:pass@us-east-2.aws.neon.tech/neondb` |
| `BETTER_AUTH_SECRET` | Better‑Auth signing secret | random string |
| `BETTER_AUTH_URL` | App base URL used by Better‑Auth | `http://localhost:3000` |
| `MISTRAL_API_KEY` | Mistral API key (chat + summaries) | `…` |
| `MODEL_NAME` | Mistral model to use | `mistral-small-latest` |
| `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` | Stream Video public API key | `xxxxx` |
| `STREAM_VIDEO_SECRET_KEY` | Stream Video secret key | `xxxxx` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) | `Iv…` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) | `…` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Password‑reset & verification emails via Resend (optional; skipped if the key is missing) | `re_…` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis, rate‑limits `/api/chat` | `…` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (webhooks, tRPC base, reset links) | `http://localhost:3000` |

#### `.env.example` (for reference)

```env
# --- Database ----------------------------------------------------
DATABASE_URL=your-postgres-database-url

# --- Auth ---------------------------------------------------------
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_URL="http://localhost:3000"

# --- OAuth (optional) --------------------------------------------
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# --- Email (Resend) ----------------------------------------------
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL="Nexa AI <no-reply@yourdomain.com>"

# --- App / Stream Video ------------------------------------------
NEXT_PUBLIC_APP_URL=your-next-public-app-url
NEXT_PUBLIC_STREAM_VIDEO_API_KEY=your-next-public-stream-video-api-key
STREAM_VIDEO_SECRET_KEY=your-stream-video-secret-key

# --- Rate limiting (Upstash) --------------------------------------
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# --- AI (Mistral) ------------------------------------------------
MODEL_NAME=mistral-small-latest
MISTRAL_API_KEY=your-mistral-api-key
```

### Database setup

The project uses **Drizzle ORM** with the **drizzle‑kit** CLI.

```bash
# Push the current schema to Neon
npm run db:push

# Or open the DB studio UI
npm run db:studio
```

For future schema changes you can generate migrations:

```bash
npx drizzle-kit generate:pg --out migrations
```

### Development

```bash
npm run dev
```

The app will be available at <http://localhost:3000>. You can create an account (email/password or social login), add AI agents, schedule a meeting, and start a video call.

### Build & Deploy

```bash
npm run build   # Next.js production build
npm start       # Run the built app
```

Deploy to **Vercel** (or any Node.js host). Set all `process.env` variables in the Vercel dashboard. The Neon connection string should be stored as a secret.

## Project Structure (high‑level)

```
src/
 ├─ app/                 – Next.js app router pages (auth, dashboard, call)
 ├─ components/          – UI primitives (buttons, dialogs, avatar)
 ├─ lib/                 – helpers (auth, stream‑video, env, rate-limit)
 ├─ db/                  – Drizzle schema & db client
 ├─ modules/
 │   ├─ agents/          – CRUD UI & tRPC router for AI agents
 │   ├─ meetings/        – CRUD UI & tRPC router for meetings
 │   ├─ auth/            – Sign‑in / sign‑up / forgot / reset / verify views
 │   ├─ home/            – Dashboard views & components
 │   └─ settings/        – Settings tabs (profile, billing, security, account)
 ├─ trpc/                – tRPC initialization & router export
 └─ constants.ts        – pagination defaults
```

## API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Sends `{ prompt, agentId }` to Mistral using the agent's instruction as system prompt, with per-user Upstash rate limiting. |
| `/api/webhooks/stream` | POST | Receive Stream Video webhook events (session start/end) and update meeting status. |
| `/api/*` (tRPC) | – | All tRPC procedures under `/api/trpc` – agents, meetings, auth, etc. |

## Voice Interaction Flow

1. User clicks **“Push to Talk”** in the call UI.
2. Browser `SpeechRecognition` captures audio → transcribes to text.
3. Text sent to `/api/chat`.
4. LLM response returned, fed to `speechSynthesis` → spoken back to the user.

All processing happens in the browser; only the text payload travels to the backend.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/my-feature`).
3. Install dependencies (`npm ci`).
4. Run lint and type‑checking: `npm run lint`.
5. Open a PR – please ensure the CI passes.

> **Note:** This project uses the **Next.js 16** app‑router APIs, which differ from older Next.js versions. Review the official docs in `node_modules/next/dist/docs/` if you need to adjust routing or API conventions.

## License

MIT © 2026 Nexa AI contributors.

## Acknowledgments

- **Stream Video** – real‑time video SDK.
- **Better‑Auth** – authentication framework.
- **Mistral** – LLM provider.
- **Neon** – serverless Postgres.
- **shadcn/ui**, **lucide-react**, **TailwindCSS** – UI building blocks.

---

Feel free to explore the `AI_SETUP.md` file for details on the voice‑assistant architecture. Happy hacking!