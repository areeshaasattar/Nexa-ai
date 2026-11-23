import Image from "next/image";
import { Bot, Mail, Mic, Video } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";
import { Reveal } from "./reveal";

const steps = [
  { n: 1, icon: Bot, title: "Pick an agent or start from a template", desc: "Create a custom agent or choose one of five ready-made templates." },
  { n: 2, icon: Mic, title: "Talk in a live call with push-to-talk", desc: "Join a video call and speak to your agent. The agent replies through your browser." },
  { n: 3, icon: Mail, title: "Get a structured summary by email", desc: "After the call, a summary with decisions and action items is generated and emailed to you." },
];

const stats = [
  { value: `${AGENT_TEMPLATES.length}`, label: "templates" },
  { value: "3", label: "steps" },
  { value: "1 minute", label: "setup" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-white py-24 lg:py-30">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal>
          <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
            {/* Left: heading + vertical steps + stats */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-nx-primary-deep">
                How it works
              </p>
              <h2 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.015em] text-nx-ink">
                Three steps to a better meeting
              </h2>

              <div className="relative mt-10">
                {/* connecting line */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-8 left-6 top-6 w-px bg-nx-line"
                />
                <ol className="space-y-8">
                  {steps.map((s) => (
                    <li key={s.n} className="relative flex gap-5">
                      <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-white bg-nx-primary-deep text-lg font-bold text-white shadow-nx-glow">
                        {s.n}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-nx-mint text-nx-primary-deep">
                            <s.icon className="size-3.5" aria-hidden="true" />
                          </span>
                          <h3 className="text-lg font-semibold text-nx-ink">{s.title}</h3>
                        </div>
                        <p className="mt-2 text-sm leading-[1.65] text-nx-body">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* stats row */}
              <div className="mt-10 grid grid-cols-3 divide-x divide-nx-line rounded-nx-card border border-nx-line bg-nx-mint-2">
                {stats.map((s) => (
                  <div key={s.label} className="px-4 py-5 text-center">
                    <div className="text-2xl font-bold text-nx-primary-deep">{s.value}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-nx-muted">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: media card + floating integration card */}
            <div className="relative mb-8 md:mb-0">
              <div className="overflow-hidden rounded-3xl border border-nx-line shadow-nx-glow">
                <Image
                  src="/landing/how-it-works.jpg"
                  alt="Illustration of a live video call with an AI agent"
                  width={1200}
                  height={900}
                  sizes="(min-width: 768px) 560px, 100vw"
                  className="h-auto w-full"
                  quality={95}
                />
              </div>
              <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-nx-card border border-nx-line bg-white p-4 shadow-nx-glow sm:left-8">
                <span className="flex size-10 items-center justify-center rounded-lg bg-nx-mint text-nx-primary-deep">
                  <Video className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-nx-ink">Live video call</div>
                  <div className="text-xs text-nx-muted">Stream-powered</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
