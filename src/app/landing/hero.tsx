import Image from "next/image";
import Link from "next/link";
import { Bot, Check, FileText, Mail, Mic, PhoneOff, Plus, Video } from "lucide-react";
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
      <div className="relative mx-auto max-w-[1200px] px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:pb-30">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Left: copy */}
          <div className="max-w-[520px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-nx-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-nx-primary-deep">
              <span className="size-1.5 rounded-full bg-nx-primary" aria-hidden="true" />
              Voice agents + live video calls
            </span>
            <h1 className="mt-6 max-w-[520px] text-[clamp(2.25rem,4.2vw,3.5rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-nx-ink">
              Talk to an AI agent in a{" "}
              <span className="text-nx-primary-deep">live call</span>. Get a clean
              summary after.
            </h1>
            <p className="mt-5 max-w-[520px] text-base leading-[1.65] text-nx-body sm:text-[17px]">
              Create an AI agent, join a video call, and speak with push-to-talk. After the call you
              get a structured summary with decisions and action items.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-nx-btn bg-nx-primary-deep px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-nx-primary-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-nx-btn border border-nx-line bg-white px-6 py-3 text-[15px] font-semibold text-nx-ink transition-colors hover:bg-nx-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm font-medium text-nx-body">
              No credit card required. Fair-use limits apply.
            </p>

            {/* Capability row */}
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

          {/* Right: visual container */}
          <div className="relative mx-auto h-[600px] w-full max-w-[540px]">
            {/* Background glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D1FAE5]/60 blur-[60px]"
            />

            {/* Phone mockup - centered */}
            <div className="absolute left-1/2 top-1/2 w-[300px] -translate-x-1/2 -translate-y-1/2 sm:w-[300px]">
              <div className="relative aspect-[9/19] overflow-hidden rounded-[40px] border-[7px] border-[#0F1F1A] shadow-[0_30px_60px_rgba(5,150,105,0.18)]">
                {/* Notch */}
                <div className="absolute left-1/2 top-0 z-20 h-[22px] w-[120px] -translate-x-1/2 rounded-b-[12px] bg-[#0F1F1A]" />
                
                {/* Full-bleed hero image */}
                <Image
                  src="/landing/hero-phone-mockup.jpg"
                  alt="Live video call with AI agent showing meeting participant"
                  fill
                  sizes="300px"
                  className="object-cover object-top"
                  priority
                />

                {/* Status bar overlay */}
                <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 pt-2 text-white">
                  <span className="text-[11px] font-medium">9:41</span>
                  <div className="flex items-center gap-1">
                    <svg className="size-3 opacity-90" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2 3h12v2H2V3zm0 4h9v2H2V7zm0 4h6v2H2v-2z" />
                    </svg>
                    <svg className="size-3 opacity-90" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M14 4h-1V3a1 1 0 0 0-2 0v1H5V3a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                    </svg>
                  </div>
                </div>

                {/* Live call chip + EXAMPLE tag */}
                <div className="absolute left-4 top-9 z-10 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Video className="size-3" aria-hidden="true" />
                    Live call
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                    Example
                  </span>
                </div>

                {/* Alex name pill */}
                <div className="absolute left-4 top-[76px] z-10 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-nx-accent/25 text-[11px] font-semibold text-nx-accent">
                    A
                  </span>
                  <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                    Alex
                  </span>
                </div>

                {/* Bottom panel with participants and controls */}
                <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-[20px] bg-white px-5 pb-5 pt-4">
                  <div className="mb-3 text-[10px] font-medium text-nx-muted">
                    Add member to call
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Avatar row */}
                    <div className="flex items-center">
                      <span className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                        A
                      </span>
                      <span className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                        P
                      </span>
                      <span className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                        M
                      </span>
                      <span className="-ml-2 flex size-9 items-center justify-center rounded-full border-2 border-white bg-nx-mint text-[11px] font-semibold text-nx-primary-deep">
                        S
                      </span>
                    </div>
                    <span className="flex size-9 items-center justify-center rounded-full bg-nx-primary text-white">
                      <Plus className="size-4" aria-hidden="true" />
                    </span>
                    <div className="ml-auto">
                      <span className="flex size-11 items-center justify-center rounded-full bg-red-500 text-white">
                        <PhoneOff className="size-5" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card 1: Meeting summary - LEFT upper-middle */}
            <div className="nx-hero-float-1 absolute -left-6 top-[140px] z-30 w-[210px] rounded-[16px] border border-[#E3EFE8] bg-white p-3 shadow-[0_10px_30px_rgba(5,150,105,0.14)] max-sm:hidden lg:-left-10">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-amber-600">
                Example
              </div>
              <div className="mb-2 text-[12px] font-semibold text-nx-ink">Meeting summary</div>
              <div className="mb-0.5 text-[10px] font-medium text-nx-muted">Decisions</div>
              <div className="mb-2 text-[11px] text-nx-ink">Launch on March 14.</div>
              <div className="mb-0.5 text-[10px] font-medium text-nx-muted">Action items</div>
              <div className="text-[11px] text-nx-ink">Priya: legal review.</div>
            </div>

            {/* Floating card 2: Chat + Push to Talk - RIGHT upper */}
            <div className="nx-hero-float-2 absolute -right-6 top-[90px] z-30 w-[220px] rounded-[16px] border border-[#E3EFE8] bg-white p-3 shadow-[0_10px_30px_rgba(5,150,105,0.14)] max-sm:hidden lg:-right-10">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-amber-600">
                Example
              </div>
              <div className="mb-2 space-y-1.5">
                <div className="rounded-md bg-nx-mint px-2 py-1.5 text-[11px] text-nx-ink">
                  <span className="font-semibold">You</span>: What should we decide today?
                </div>
                <div className="rounded-md bg-nx-mint px-2 py-1.5 text-[11px] text-nx-ink">
                  <span className="font-semibold text-nx-primary-deep">Agent</span>: Let&apos;s pick one clear next step.
                </div>
                <div className="rounded-md bg-nx-mint px-2 py-1.5 text-[11px] text-nx-ink">
                  <span className="font-semibold text-nx-primary-deep">Agent</span>: I&apos;ll note the decision.
                </div>
              </div>
              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-nx-primary-deep px-3 py-2 text-[11px] font-semibold text-white"
              >
                <Mic className="size-3.5" aria-hidden="true" />
                Push to Talk
              </button>
            </div>

            {/* Floating card 3: Status - LEFT lower */}
            <div className="nx-hero-float-3 absolute bottom-[80px] -left-4 z-30 w-[170px] rounded-[16px] border border-[#E3EFE8] bg-white p-3 shadow-[0_10px_30px_rgba(5,150,105,0.14)] max-lg:hidden lg:-left-8">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-amber-600">
                Example
              </div>
              <div className="flex items-start gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-nx-primary text-white">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-nx-ink">Summary ready</div>
                  <div className="text-[10px] text-nx-muted">Emailed to you</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
