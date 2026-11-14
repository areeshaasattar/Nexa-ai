import { Bot, Mail, Mic } from "lucide-react";

const steps = [
  { n: 1, icon: Bot, title: "Pick an agent or start from a template", desc: "Create a custom agent or choose one of five ready-made templates." },
  { n: 2, icon: Mic, title: "Talk in a live call with push-to-talk", desc: "Join a video call and speak to your agent. The agent replies through your browser." },
  { n: 3, icon: Mail, title: "Get a structured summary by email", desc: "After the call, a summary with decisions and action items is generated and emailed to you." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Three steps to a better meeting</h2>
        <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
          {/* connecting line on desktop */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-6 hidden h-px bg-slate-200 sm:block"
          />
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="relative z-10 flex size-12 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-lg font-bold text-white shadow">
                {s.n}
              </div>
              <div className="mt-4 flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <s.icon className="size-4" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}