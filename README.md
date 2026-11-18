# Nexa AI

A Next.js-based AI meeting platform that combines real-time video conferencing with intelligent voice assistants. Create custom AI agents, conduct voice-enabled video meetings, and automatically generate structured meeting summaries.

## Overview

**Nexa AI** enables users to schedule and conduct video meetings with custom AI voice assistants. The platform features browser-based voice interaction (speech-to-text and text-to-speech), automatic meeting transcription, and AI-generated structured summaries with coaching feedback for interview practice sessions.

## ✨ Key Features

### 🤖 Custom AI Agents
- Create unlimited AI agents with custom names and instructions
- Five pre-built templates: Brainstorm Partner, Interview Coach, Language Tutor, Sales Call Practice, Standup Buddy
- One-click quick start from templates
- Full CRUD operations with ownership tracking

### 📹 Video Meetings
- Stream Video SDK integration with automatic token generation
- HD recording (720p) with auto-transcription
- Real-time video calls with lobby and controls
- Meeting scheduling and status tracking (scheduled, ongoing, completed)
- Recordings and transcriptions storage

### 🎙️ AI Voice Assistant
- Push-to-talk speech recognition (browser native)
- Streaming AI responses via Server-Sent Events (SSE)
- Text-to-speech playback (browser native)
- Conversation history per meeting
- Performance metrics tracking (response time, duration)

### 📊 Intelligent Summaries
- Structured meeting summaries with JSON validation
- Auto-generated from Stream transcripts or conversation history
- **Interview Coaching Reports** for practice sessions:
  - Overall performance score (1-10)
  - Detailed rubric (clarity, structure, confidence, answer quality)
  - Filler words analysis with examples
  - Strengths and improvement suggestions
  - Better answer examples for key questions
- Sentiment analysis (positive, neutral, negative)
- Decisions, action items (with owners and due dates), topics, and open questions extraction
- Owner verification against transcript (no hallucinated assignments)
- Markdown export for sharing
- Optional email delivery after each meeting

### 🔐 Authentication & Security
- Email/password authentication with email verification
- OAuth support (GitHub & Google)
- Password reset flow via Brevo transactional emails
- Session management with Better-Auth
- Protected routes and owner-scoped data access

### 📈 Analytics Dashboard
- Meeting statistics and trends (7-day charts)
- Voice interaction metrics (avg response time, total interactions)
- Agent usage tracking
- System health monitoring (database, email, rate limiting)
- Activity feed with filtering
- AI-powered insights and recommendations

### ⚙️ Settings & Account Management
- Profile editing (name, bio, avatar upload with 2MB limit)
- Email change with verification
- Password change with session revocation
- Summary email preferences toggle
- Account details and security settings

### 🎯 Additional Features
- **Command palette** (⌘K / Ctrl+K) for quick navigation and actions
- **Feedback system** with admin review portal
- **Rate limiting** via Upstash Redis (per-user, per-minute and daily limits)
- **Responsive design** with mobile-optimized sidebar and dialogs
- **Empty states** and onboarding checklist for new users
- **Legal pages** (Terms of Service, Privacy Policy)
- **Public landing page** with features showcase and FAQ
- **Keyboard shortcuts** and accessibility (WCAG AA compliant)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons, Framer Motion |
| **API / RPC** | tRPC v11, Next.js API routes, Server-Sent Events (SSE) |
| **Database** | Neon PostgreSQL, Drizzle ORM 0.45, drizzle-kit migrations |
| **Authentication** | Better-Auth 1.6 with Drizzle adapter, OAuth (GitHub + Google) |
| **Email** | Brevo (transactional: verification, reset, change email, summaries) |
| **AI / LLM** | Mistral API (primary), optional Groq fallback |
| **Video** | Stream Video SDK (client + server), webhooks, recordings/transcriptions |
| **Rate Limiting** | Upstash Redis with sliding window |
| **Forms** | React Hook Form, Zod v4 validation |
| **Charts** | ApexCharts, Recharts |
| **Avatars** | DiceBear (generated avatars) |
| **Testing** | TypeScript type checking, ESLint, custom test scripts |
| **CI/CD** | GitHub Actions (type check, lint, tests, build) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 LTS
- **npm** (or yarn/pnpm/bun)
- **Neon PostgreSQL** database
- **Stream Video** API keys
- **Mistral API key**
- **Brevo** account (for emails)
- **Upstash Redis** (for rate limiting)
- (Optional) **GitHub/Google OAuth** credentials
- (Optional) **Groq API key** (LLM fallback)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/nexa-ai.git
cd nexa-ai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following required variables:

```env
# --- Database (Required) ---
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# --- Authentication (Required) ---
BETTER_AUTH_SECRET=your-random-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# --- AI / LLM (Required) ---
MISTRAL_API_KEY=your-mistral-api-key
MODEL_NAME=mistral-small-latest

# --- Video (Required) ---
NEXT_PUBLIC_STREAM_VIDEO_API_KEY=your-stream-public-key
STREAM_VIDEO_SECRET_KEY=your-stream-secret-key

# --- Email (Required for auth flows) ---
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Nexa AI

# --- Rate Limiting (Required) ---
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# --- Application ---
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- OAuth (Optional) ---
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# --- LLM Fallback (Optional) ---
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL_NAME=mixtral-8x7b-32768
LLM_FALLBACK_ENABLED=true

# --- Admin (Optional) ---
ADMIN_EMAILS=admin@yourdomain.com,admin2@yourdomain.com
```

See `.env.example` for the complete list with descriptions.

### Database Setup

```bash
# Run database migrations
npm run db:migrate

# Or push schema directly (development only)
npm run db:push

# Open Drizzle Studio (optional)
npm run db:studio
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run tests
npm test
```

**Deployment:** Deploy to Vercel, Netlify, or any Node.js host. Set all environment variables in your hosting platform's dashboard.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/            # Authentication pages (sign-in, sign-up, verify, reset)
│   ├── (dashboard)/       # Protected dashboard routes (home, agents, meetings, settings)
│   ├── call/              # Video call UI and components
│   ├── api/               # API routes (chat, webhooks, tRPC)
│   └── page.tsx           # Public landing page
├── components/            # Reusable UI components (shadcn/ui)
│   └── ui/               # Base UI primitives
├── db/                    # Database schema and client (Drizzle ORM)
├── hooks/                 # Custom React hooks (voice-assistant, mobile, etc.)
├── lib/                   # Utilities and helpers
│   ├── auth-client.ts    # Better-Auth client configuration
│   ├── llm.ts            # LLM provider wrapper (Mistral + Groq fallback)
│   ├── meeting-summary.ts # Summary generation orchestration
│   ├── summary-schema.ts  # Zod schemas for structured summaries
│   ├── transcript-parser.ts # Stream JSONL transcript parser
│   ├── email.ts          # Brevo email integration
│   └── rate-limit.ts     # Upstash rate limiter
├── modules/               # Feature modules
│   ├── agents/           # Agent CRUD (UI + tRPC router)
│   ├── meetings/         # Meeting CRUD (UI + tRPC router)
│   ├── home/             # Dashboard views and analytics
│   └── settings/         # Settings tabs (profile, security, account)
├── trpc/                  # tRPC setup and routers
└── constants.ts           # Global constants (pagination, limits)
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Streaming AI chat with rate limiting and conversation history |
| `/api/webhooks/stream` | POST | Stream Video webhook handler (session start/end, recordings, transcriptions) |
| `/api/trpc/[trpc]` | GET/POST | tRPC endpoint for all server procedures |
| `/api/auth/[...all]` | GET/POST | Better-Auth authentication handler |

## 🎯 Voice Interaction Flow

1. **Push to Talk**: Click button to activate browser speech recognition
2. **Speech-to-Text**: Browser captures and transcribes audio (native Web Speech API)
3. **AI Processing**: Text sent to `/api/chat` → Mistral API with agent instruction as system prompt
4. **Streaming Response**: Server-Sent Events (SSE) stream the AI response progressively
5. **Text-to-Speech**: Browser speaks the response (native Speech Synthesis API)
6. **Persistence**: Conversation turns saved to database for history and summaries

**Note:** The AI does not join the video call as a participant. Voice interaction happens in the browser, and only text payloads travel to the backend.

## 🧪 Testing

```bash
# Run all tests
npm test

# Individual test suites
npm run test:summary              # Summary schema and generation tests
npm run test:transcript-parser    # Transcript parsing tests
npm run test:agent-templates      # Agent template validation
npm run test:limits               # Rate limiting tests
npm run test:email                # Email formatting tests

# Live tests (require API keys)
npm run test:summary:live         # Real Mistral API calls
npm run test:webhook-replay       # Webhook signature verification (requires dev server)
```

## 📚 Documentation

- **[FEATURES.md](./FEATURES.md)** - Complete feature inventory and architecture details
- **[AI_SETUP.md](./AI_SETUP.md)** - Voice assistant architecture and setup guide
- **[AGENTS.md](./AGENTS.md)** - Next.js-specific agent rules and conventions
- **[COACHING_IMPLEMENTATION.md](./COACHING_IMPLEMENTATION.md)** - Interview coaching report feature details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Install dependencies (`npm ci`)
4. Make your changes
5. Run tests and linting (`npm test && npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feat/amazing-feature`)
8. Open a Pull Request

**Important:** This project uses **Next.js 16 App Router APIs**, which differ from older Next.js versions. Review the official docs or check `node_modules/next/dist/docs/` for routing and API conventions.

## 🐛 Known Limitations

- Browser speech recognition requires HTTPS in production (or localhost for dev)
- Speech recognition availability varies by browser (best in Chrome/Edge)
- Rate limits: 10 quick-starts per hour, 30 chat requests per minute per user
- Meeting quotas: configurable per user (default limits in code)
- Summary generation: retries once on validation failure, then stores flagged fallback
- Email sending: Brevo free tier limited to 300/day; failures release claim for retry
- Stream transcripts may have delays; summaries can regenerate when richer transcript arrives

## 📄 License

MIT © 2026 Nexa AI Contributors

## 🙏 Acknowledgments

- **[Stream Video](https://getstream.io/video/)** - Real-time video infrastructure
- **[Better-Auth](https://www.better-auth.com/)** - Modern authentication framework
- **[Mistral AI](https://mistral.ai/)** - Large language model provider
- **[Neon](https://neon.tech/)** - Serverless PostgreSQL
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful UI components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Lucide Icons](https://lucide.dev/)** - Beautiful icon library
- **[Brevo](https://www.brevo.com/)** - Transactional email service
- **[Upstash](https://upstash.com/)** - Serverless Redis for rate limiting

---

**Need help?** Check out the documentation files or open an issue on GitHub. For AI assistant details, see [AI_SETUP.md](./AI_SETUP.md).

**Ready to start?** Create an account at [localhost:3000](http://localhost:3000), deploy your first AI agent, and experience the future of AI-powered meetings! 🚀
