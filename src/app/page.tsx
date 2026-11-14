import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Sparkles,
  Video,
} from "lucide-react";
import { LandingMobileMenu } from "./landing-mobile-menu";
import { Button } from "@/components/ui/button";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Nexa AI - Talk to an AI agent in a live call",
  description:
    "Create AI agents, join a live video call, talk with push-to-talk, and get a clean structured summary by email after the call.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nexa AI - Talk to an AI agent in a live call",
    description:
      "Create AI agents, join a live video call, talk with push-to-talk, and get a clean structured summary by email after the call.",
    url: "/",
    siteName: "Nexa AI",
    type: "website",
    images: [{ url: "/logo.svg", width: 120, height: 120, alt: "Nexa AI logo" }],
  },
  twitter: {
    card: "summary",
    title: "Nexa AI - Talk to an AI agent in a live call",
    description:
      "Create AI agents, join a live video call, talk with push-to-talk, and get a clean structured summary by email after the call.",
  },
  robots: { index: true, follow: true },
};

const features = [
  {
    icon: Bot,
    title: "Voice agents you can customize",
    description: "Write your own instructions or start from a template. Each agent has its own persona.",
  },
  {
    icon: Sparkles,
    title: "Ready-made templates",
    description: "Five starter agents for brainstorming, interviews, language practice, sales, and standups.",
  },
  {
    icon: Video,
    title: "Live video calls",
    description: "Schedule a meeting and join a Stream-powered video call from your browser.",
  },
  {
    icon: FileText,
    title: "Structured summaries",
    description: "After the call, get an overview, decisions, action items, topics, and open questions.",
  },
  {
    icon: Mail,
    title: "Summary emails you can switch off",
    description: "Summaries are emailed to you by default. Turn them off anytime in Settings.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    description: "Only you can see your agents, meetings, and summaries. Delete them anytime.",
  },
];

const steps = [
  {
    icon: Bot,
    title: "Pick an agent or start from a template",
    description: "Create a custom agent or choose one of five ready-made templates.",
  },
  {
    icon: Mic,
    title: "Talk in a live call with push-to-talk",
    description: "Join a video call and speak to your agent. The agent replies through your browser.",
  },
  {
    icon: Mail,
    title: "Get a structured summary by email",
    description: "After the call, a summary with decisions and action items is generated and emailed to you.",
  },
];

const faqs = [
  {
    q: "Is it free?",
    a: "No payment is required during beta. Fair-use limits apply to keep the service available for everyone.",
  },
  {
    q: "Which browsers work best?",
    a: "Voice input uses your browser's speech recognition and works best in Chrome or Edge.",
  },
  {
    q: "Are calls recorded?",
    a: "Calls are recorded and transcribed by Stream so a summary can be generated after the call.",
  },
  {
    q: "Who can see my meetings and summaries?",
    a: "Only you, the owner. Agents, meetings, and summaries are private to your account.",
  },
  {
    q: "Can I turn off summary emails?",
    a: "Yes. You can switch summary emails off in Settings at any time.",
  },
  {
    q: "Does the AI join the call as a participant?",
    a: "No. The AI speaks through your browser using text-to-speech and does not appear as a video participant.",
  },
];

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow"
      >
        Skip to content
      </a>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6" aria-label="Primary">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Nexa AI"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-lg font-bold tracking-tight">Nexa AI</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              How it works
            </a>
            <a href="#templates" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Templates
            </a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              FAQ
            </a>
            <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>

          <div className="md:hidden">
            <LandingMobileMenu />
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Talk to an AI agent in a live call. Get a clean summary after.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Create an AI agent, join a video call, and speak with push-to-talk. After the call you
                get a structured summary with decisions and action items.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/sign-up">Get started free</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                No credit card required. Fair-use limits apply.
              </p>
            </div>

            {/* Static product mock */}
            <div className="relative" aria-hidden="true">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">Example</span>
                  <span>Sample call view</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 aspect-video rounded-lg bg-slate-900 flex items-center justify-center text-white text-sm">
                    <Video className="size-8 opacity-60" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                      <MessageSquare className="mb-1 size-3" /> You: What should we decide today?
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                      <Bot className="mb-1 size-3" /> Agent: Let&apos;s pick one clear next step.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <s.icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-slate-500">Step {i + 1}</div>
                  <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Features</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 p-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <f.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Templates preview */}
        <section id="templates" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready-made templates</h2>
            <p className="mt-2 text-slate-600">Start from one of five agents. Sign up to try them.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_TEMPLATES.map((t) => (
                <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Bot className="size-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/sign-up">Sign up to try them</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Good to know */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Good to know</h2>
          <ul className="mt-6 space-y-3 text-slate-600">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Voice input uses your browser&apos;s speech recognition and works best in Chrome or Edge.</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Calls are recorded and transcribed so summaries can be generated.</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>The AI speaks through your browser and does not appear as a video participant.</span>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-slate-200 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-8 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                    {f.q}
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 text-sm text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="rounded-2xl border border-slate-200 bg-emerald-600 p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to talk to an AI agent?</h2>
            <p className="mt-3 text-emerald-50">Create your first agent in a minute.</p>
            <div className="mt-6">
              <Button asChild size="lg" variant="secondary" className="bg-white text-emerald-700 hover:bg-emerald-50">
                <Link href="/sign-up">Get started free</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5" aria-hidden="true" />
            <span>Nexa AI</span>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/sign-in" className="hover:text-slate-900">Sign in</Link>
          </div>
          <div>&copy; {year} Nexa AI</div>
        </div>
      </footer>
    </div>
  );
}