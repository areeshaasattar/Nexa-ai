import Link from "next/link";
import { Camera, Mic, PhoneOff, Video } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 text-white">
      {/* radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl"
      />
      {/* faint grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Voice agents + live video calls
            </span>
            <h1 className="mt-6 text-[clamp(2.5rem,5vw,4.25rem)] font-bold leading-[1.05] tracking-tight">
              Talk to an AI agent in a <span className="text-emerald-400">live call</span>. Get a
              clean summary after.
            </h1>
            <p className="mt-5 max-w-[65ch] text-lg leading-relaxed text-white/75">
              Create an AI agent, join a video call, and speak with push-to-talk. After the call you
              get a structured summary with decisions and action items.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-green-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Get started free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-white/60">
              No credit card required. Fair-use limits apply.
            </p>
          </div>

          {/* App window mock */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-400/80" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-amber-400/80" aria-hidden="true" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" aria-hidden="true" />
                <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Example
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex aspect-video flex-col justify-between rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">
                      A
                    </div>
                    <span className="rounded bg-black/40 px-2 py-0.5 text-xs text-white">Alex</span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
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
                <div className="flex flex-col gap-2 rounded-lg bg-white/5 p-2">
                  <div className="rounded-md bg-white/10 p-2 text-[11px] text-white/80">
                    <span className="font-medium text-white">You</span>: What should we decide today?
                  </div>
                  <div className="rounded-md bg-emerald-500/15 p-2 text-[11px] text-emerald-100">
                    <span className="font-medium text-emerald-300">Agent</span>: Let&apos;s pick one clear
                    next step.
                  </div>
                  <div className="rounded-md bg-emerald-500/15 p-2 text-[11px] text-emerald-100">
                    <span className="font-medium text-emerald-300">Agent</span>: I&apos;ll note the decision.
                  </div>
                  <button
                    type="button"
                    className="mt-auto inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1.5 text-[11px] font-semibold text-green-950"
                  >
                    <Mic className="size-3" aria-hidden="true" />
                    Push to Talk
                  </button>
                </div>
              </div>
            </div>

            {/* floating summary card */}
            <div className="absolute -bottom-6 -left-6 w-60 rounded-xl border border-white/10 bg-white p-4 text-slate-900 shadow-2xl motion-safe:animate-[float_6s_ease-in-out_infinite]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Example
              </div>
              <div className="mt-1 text-sm font-semibold">Meeting summary</div>
              <div className="mt-2 text-xs text-slate-500">Decisions</div>
              <div className="text-xs text-slate-700">Launch on March 14.</div>
              <div className="mt-2 text-xs text-slate-500">Action items</div>
              <div className="text-xs text-slate-700">Priya: legal review.</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-\\[float_6s_ease-in-out_infinite\\] { animation: none; }
        }
      `}</style>
    </section>
  );
}