import { CheckCircle2, Globe, Mic, Video } from "lucide-react";

const notes = [
  { icon: Mic, text: "Voice input uses your browser's speech recognition and works best in Chrome or Edge." },
  { icon: Video, text: "Calls are recorded and transcribed so summaries can be generated." },
  { icon: Globe, text: "The AI speaks through your browser and does not appear as a video participant." },
];

export function GoodToKnow() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Good to know</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">A few helpful notes</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {notes.map((n) => (
            <div key={n.text} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <p className="text-sm text-slate-600">{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}