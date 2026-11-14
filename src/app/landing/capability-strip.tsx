import { Bot, FileText, Mail, Mic } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";

const items = [
  { icon: Bot, label: `${AGENT_TEMPLATES.length} ready-made templates` },
  { icon: Mic, label: "Push-to-talk voice" },
  { icon: FileText, label: "Structured summaries" },
  { icon: Mail, label: "Summary emails" },
];

export function CapabilityStrip() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <it.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-slate-700">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}