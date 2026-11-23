import { ChevronDown } from "lucide-react";
import { Reveal } from "./reveal";

const faqs = [
  { q: "Is it free?", a: "No payment is required during beta. Fair-use limits apply to keep the service available for everyone." },
  { q: "Which browsers work best?", a: "Voice input uses your browser's speech recognition and works best in Chrome or Edge." },
  { q: "Are calls recorded?", a: "Calls are recorded and transcribed by Stream so a summary can be generated after the call." },
  { q: "Who can see my meetings and summaries?", a: "Only you, the owner. Agents, meetings, and summaries are private to your account." },
  { q: "Can I turn off summary emails?", a: "Yes. You can switch summary emails off in Settings at any time." },
  { q: "Does the AI join the call as a participant?", a: "No. The AI speaks through your browser using text-to-speech and does not appear as a video participant." },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-nx-mint py-24 lg:py-30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-nx-primary-deep">
              FAQ
            </p>
            <h2 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.015em] text-nx-ink">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-nx-card border border-nx-line bg-white p-5 shadow-nx-glow"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-nx-ink [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep">
                  {f.q}
                  <ChevronDown
                    className="size-4 shrink-0 text-nx-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-nx-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
