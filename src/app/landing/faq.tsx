import { ChevronDown } from "lucide-react";

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
    <section id="faq" className="scroll-mt-20 bg-emerald-50/60 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">FAQ</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {f.q}
                <ChevronDown className="size-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}