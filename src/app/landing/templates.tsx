"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Check } from "lucide-react";
import { AGENT_TEMPLATES } from "@/lib/agent-templates";
import { Reveal } from "./reveal";

const checklist = [
  `${AGENT_TEMPLATES.length} ready-made templates`,
  "Push-to-talk voice",
  "Structured summaries",
  "Summary emails",
];

export function Templates() {
  const [selectedId, setSelectedId] = useState(AGENT_TEMPLATES[0].id);
  const selected =
    AGENT_TEMPLATES.find((t) => t.id === selectedId) ?? AGENT_TEMPLATES[0];

  return (
    <section id="templates" className="scroll-mt-24 bg-nx-mint py-24 lg:py-30">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-nx-primary-deep">
            Templates
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-nx-ink sm:text-4xl">
            Ready-made templates
          </h2>
          <p className="mt-2 text-nx-muted">
            Start from one of {AGENT_TEMPLATES.length} agents. Sign up to try them.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
            {/* Left: checklist + live preview + CTA */}
            <div className="flex flex-col rounded-nx-card border border-nx-line bg-white p-6 shadow-nx-glow sm:p-8">
              <ul className="space-y-3">
                {checklist.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-nx-ink">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nx-mint text-nx-primary-deep">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="my-6 h-px bg-nx-line" aria-hidden="true" />

              {/* Preview of the selected template */}
              <div aria-live="polite">
                <div className="text-xs font-semibold uppercase tracking-widest text-nx-muted">
                  Preview
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-nx-mint text-nx-primary-deep">
                    <Bot className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-nx-ink">{selected.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-nx-muted">
                      {selected.description}
                    </p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center rounded-full border border-nx-line bg-nx-mint-2 px-3 py-1 text-xs font-medium text-nx-primary-deep">
                  Suggested call: {selected.suggestedMeetingName}
                </span>
              </div>

              <div className="mt-8">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center rounded-nx-btn bg-nx-primary-deep px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-nx-primary-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
                >
                  Sign up to try them
                </Link>
              </div>
            </div>

            {/* Right: selectable template rows */}
            <fieldset>
              <legend className="sr-only">Choose a template to preview</legend>
              <div className="space-y-3">
                {AGENT_TEMPLATES.map((t) => {
                  const isSelected = t.id === selectedId;
                  return (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-nx-card border p-4 transition-all sm:p-5 ${
                        isSelected
                          ? "border-nx-primary-deep bg-nx-primary-deep shadow-nx-glow"
                          : "border-nx-line bg-white hover:-translate-y-0.5 hover:shadow-nx-glow motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-nx-primary-deep`}
                    >
                      <input
                        type="radio"
                        name="template-preview"
                        value={t.id}
                        checked={isSelected}
                        onChange={() => setSelectedId(t.id)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? "border-white" : "border-nx-line"
                        }`}
                      >
                        {isSelected && <span className="size-2.5 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span
                          className={`block font-semibold ${isSelected ? "text-white" : "text-nx-ink"}`}
                        >
                          {t.name}
                        </span>
                        <span
                          className={`mt-0.5 block text-sm ${isSelected ? "text-nx-mint" : "text-nx-muted"}`}
                        >
                          {t.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
