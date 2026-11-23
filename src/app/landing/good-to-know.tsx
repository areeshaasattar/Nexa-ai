import { CheckCircle2, Globe, Mic, Video } from "lucide-react";
import { Reveal } from "./reveal";

const notes = [
  { icon: Mic, text: "Voice input uses your browser's speech recognition and works best in Chrome or Edge." },
  { icon: Video, text: "Calls are recorded and transcribed so summaries can be generated." },
  { icon: Globe, text: "The AI speaks through your browser and does not appear as a video participant." },
];

export function GoodToKnow() {
  return (
    <section className="bg-white py-24 lg:py-30">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-nx-primary-deep">
            Good to know
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-nx-ink sm:text-4xl">
            A few helpful notes
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {notes.map((n) => (
              <div
                key={n.text}
                className="flex gap-3 rounded-nx-card border border-nx-line bg-white p-5 shadow-nx-glow transition hover:-translate-y-0.5 hover:shadow-nx-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-nx-primary-deep" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-nx-muted">{n.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
