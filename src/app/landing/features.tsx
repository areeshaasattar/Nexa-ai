import { Bot, Camera, FileText, Lock, Mail, Mic, PhoneOff, Sparkles, Video } from "lucide-react";
import { Reveal } from "./reveal";

const features = [
  { icon: Bot, title: "Voice agents you can customize", desc: "Write your own instructions or start from a template." },
  { icon: Sparkles, title: "Ready-made templates", desc: "Five starter agents for brainstorming, interviews, language practice, sales, and standups." },
  { icon: Video, title: "Live video calls", desc: "Schedule a meeting and join a Stream-powered video call from your browser." },
  { icon: FileText, title: "Structured summaries", desc: "Overview, decisions, action items, topics, and open questions after each call." },
  { icon: Mail, title: "Summary emails you can switch off", desc: "Summaries are emailed by default. Turn them off anytime in Settings." },
  { icon: Lock, title: "Your data stays yours", desc: "Only you can see your agents, meetings, and summaries. Delete them anytime." },
];

const participants = [
  { initial: "A", name: "Alex", large: true },
  { initial: "P", name: "Priya", large: false },
  { initial: "M", name: "Marcus", large: false },
];

export function Features() {
  return (
    <section className="bg-white py-24 lg:py-30">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal>
          <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
            {/* Left: mock video-call grid */}
            <div className="rounded-nx-media border border-nx-line bg-white p-5 shadow-nx-glow">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-nx-ink">
                  <Video className="size-4 text-nx-primary-deep" aria-hidden="true" />
                  Live call
                </span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Example
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {participants.map((p) => (
                  <div
                    key={p.name}
                    className={`relative flex aspect-video flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-nx-deep-2 to-nx-deep p-3 ${p.large ? "col-span-2" : ""}`}
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-nx-accent/25 text-sm font-semibold text-nx-accent">
                      {p.initial}
                    </span>
                    <span className="self-start rounded bg-black/40 px-2 py-0.5 text-xs text-white">
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-nx-mint text-nx-primary-deep">
                  <Mic className="size-4" aria-hidden="true" />
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-nx-mint text-nx-primary-deep">
                  <Camera className="size-4" aria-hidden="true" />
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-red-500 text-white">
                  <PhoneOff className="size-4" aria-hidden="true" />
                </span>
              </div>
            </div>

            {/* Right: heading + compact feature list */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nx-primary-deep">
                Features
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-nx-ink sm:text-4xl">
                Everything you need for a productive call
              </h2>
              <p className="mt-4 max-w-[65ch] text-nx-muted">
                Create an AI agent, join a video call, and speak with push-to-talk. After the call
                you get a structured summary with decisions and action items.
              </p>
              <div className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2">
                {features.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-nx-mint text-nx-primary-deep">
                      <f.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-nx-ink">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-nx-muted">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center rounded-nx-btn border border-nx-line bg-white px-5 py-2.5 text-sm font-semibold text-nx-ink transition-colors hover:bg-nx-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
                >
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
