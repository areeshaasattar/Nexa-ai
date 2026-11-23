import Image from "next/image";
import Link from "next/link";
import { Bot, Camera, FileText, Mail, Mic, PhoneOff, Plus, Video } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";

const capabilities = [
  { icon: Bot, label: `${AGENT_TEMPLATES.length} ready-made templates` },
  { icon: Mic, label: "Push-to-talk voice" },
  { icon: FileText, label: "Structured summaries" },
  { icon: Mail, label: "Summary emails" },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft green glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-nx-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:pb-30">
        <div className="grid items-center gap-14 md:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-nx-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-nx-primary-deep">
              <span className="size-1.5 rounded-full bg-nx-primary" aria-hidden="true" />
              Voice agents + live video calls
            </span>
            <h1 className="mt-6 text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight text-nx-ink">
              Talk to an AI agent in a{" "}
              <span className="text-nx-primary-deep">live call</span>. Get a clean
              summary after.
            </h1>
            <p className="mt-5 max-w-[65ch] text-lg leading-relaxed text-nx-muted">
              Create an AI agent, join a video call, and speak with push-to-talk. After the call you
              get a structured summary with decisions and action items.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-nx-btn bg-nx-primary-deep px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-nx-primary-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-nx-btn border border-nx-line bg-white px-6 py-3 text-sm font-semibold text-nx-ink transition-colors hover:bg-nx-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-nx-muted">
              No credit card required. Fair-use limits apply.
            </p>

            {/* Capability row (replaces partner logos) */}
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4">
              {capabilities.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-nx-mint text-nx-primary-deep">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-nx-ink">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: phone mockup + floating cards */}
          <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center md:block md:max-w-none">
            {/* Phone-style device frame */}
            <div className="relative w-[270px] rounded-[2.75rem] border border-nx-line bg-nx-deep p-2.5 shadow-nx-lift sm:w-[290px] lg:w-[320px]">
              <div className="overflow-hidden rounded-[2.25rem] bg-gradient-to-b from-nx-deep-2 to-nx-deep">
                <div className="flex items-center justify-between px-5 pt-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                    <Video className="size-3.5" aria-hidden="true" />
                    Live call
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                    Example
                  </span>
                </div>
                {/* Video feed placeholder */}
                <div className="relative mx-3 mt-3 aspect-[4/5] overflow-hidden rounded-2xl">
                  <Image
                    src="/landing/hero-phone-mockup.jpg"
                    alt="Example video feed of a call participant"
                    fill
                    sizes="320px"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-nx-accent/25 text-xs font-semibold text-nx-accent">
                      A
                    </span>
                    <span className="rounded bg-black/40 px-2 py-0.5 text-[11px] text-white">
                      Alex
                    </span>
                  </div>
                </div>
                {/* Call controls */}
                <div className="flex items-center justify-center gap-3 px-4 py-5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white">
                    <Mic className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white">
                    <Camera className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-red-500 text-white">
                    <PhoneOff className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>

            {/* Floating card: meeting summary (static below phone on mobile) */}
            <div className="nx-float mt-6 w-full max-w-[300px] rounded-nx-card border border-nx-line bg-white p-4 shadow-nx-glow md:absolute md:-left-2 md:bottom-6 md:mt-0 md:w-52 lg:-left-8">
              <div className="text-[10px] font-bold uppercase tracking-widest text-nx-primary-deep">
                Example
              </div>
              <div className="mt-1 text-sm font-semibold text-nx-ink">Meeting summary</div>
              <div className="mt-2 text-xs text-nx-muted">Decisions</div>
              <div className="text-xs text-nx-ink">Launch on March 14.</div>
              <div className="mt-2 text-xs text-nx-muted">Action items</div>
              <div className="text-xs text-nx-ink">Priya: legal review.</div>
            </div>

            {/* Floating card: chat + push to talk (hidden on mobile) */}
            <div className="nx-float-delayed hidden rounded-nx-card border border-nx-line bg-white p-3 shadow-nx-glow md:absolute md:-right-2 md:top-4 md:block md:w-56 lg:-right-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-nx-primary-deep">
                Example
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="rounded-md bg-nx-mint p-2 text-[11px] text-nx-ink">
                  <span className="font-semibold">You</span>: What should we decide today?
                </div>
                <div className="rounded-md bg-nx-mint p-2 text-[11px] text-nx-ink">
                  <span className="font-semibold text-nx-primary-deep">Agent</span>: Let&apos;s pick
                  one clear next step.
                </div>
                <div className="rounded-md bg-nx-mint p-2 text-[11px] text-nx-ink">
                  <span className="font-semibold text-nx-primary-deep">Agent</span>: I&apos;ll note
                  the decision.
                </div>
              </div>
              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-nx-btn bg-nx-primary-deep px-2 py-1.5 text-[11px] font-semibold text-white"
              >
                <Mic className="size-3" aria-hidden="true" />
                Push to Talk
              </button>
            </div>

            {/* Floating card: participants (hidden on mobile) */}
            <div className="hidden rounded-nx-card border border-nx-line bg-white p-3 shadow-nx-glow md:absolute md:-right-4 md:bottom-28 md:block lg:-right-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-nx-primary-deep">
                Example
              </div>
              <div className="mt-2 flex items-center">
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                  A
                </span>
                <span className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                  P
                </span>
                <span className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                  M
                </span>
                <span
                  className="-ml-2 flex size-8 items-center justify-center rounded-full bg-nx-primary-deep text-white"
                  aria-label="Add participant (example)"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
