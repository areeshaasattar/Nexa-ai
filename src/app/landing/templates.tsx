import Link from "next/link";
import { Bot } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";

export function Templates() {
  return (
    <section id="templates" className="scroll-mt-20 bg-emerald-50/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Templates</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ready-made templates</h2>
        <p className="mt-2 text-slate-600">Start from one of {AGENT_TEMPLATES.length} agents. Sign up to try them.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Bot className="size-4" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{t.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Sign up to try them
          </Link>
        </div>
      </div>
    </section>
  );
}