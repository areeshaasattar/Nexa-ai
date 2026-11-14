import { Bot, FileText, Lock, Mail, Sparkles, Video } from "lucide-react";

const features = [
  { icon: Bot, title: "Voice agents you can customize", desc: "Write your own instructions or start from a template.", accent: "bg-violet-100 text-violet-700" },
  { icon: Sparkles, title: "Ready-made templates", desc: "Five starter agents for brainstorming, interviews, language practice, sales, and standups.", accent: "bg-amber-100 text-amber-700" },
  { icon: Video, title: "Live video calls", desc: "Schedule a meeting and join a Stream-powered video call from your browser.", accent: "bg-blue-100 text-blue-700" },
  { icon: FileText, title: "Structured summaries", desc: "Overview, decisions, action items, topics, and open questions after each call.", accent: "bg-emerald-100 text-emerald-700" },
  { icon: Mail, title: "Summary emails you can switch off", desc: "Summaries are emailed by default. Turn them off anytime in Settings.", accent: "bg-rose-100 text-rose-700" },
  { icon: Lock, title: "Your data stays yours", desc: "Only you can see your agents, meetings, and summaries. Delete them anytime.", accent: "bg-slate-100 text-slate-700" },
];

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Features</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything you need for a productive call</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className={`mb-4 flex size-10 items-center justify-center rounded-lg ${f.accent}`}>
                <f.icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}