"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleIcon,
  ClipboardListIcon,
  CopyIcon,
  HelpCircleIcon,
  RefreshCwIcon,
  TagIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  summaryToMarkdown,
  type StoredMeetingSummary,
} from "@/lib/summary-schema";
import { CoachingReport } from "./coaching-report";

interface StructuredSummaryProps {
  summary: StoredMeetingSummary;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h4 className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
        <span className="size-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-700">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

export function CopyMarkdownButton({ summary }: { summary: StoredMeetingSummary }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryToMarkdown(summary));
      setCopied(true);
      toast.success("Summary copied as Markdown");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the summary");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="rounded-lg text-xs font-semibold border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 gap-2 px-4 shadow-sm"
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {copied ? "Copied!" : "Copy as Markdown"}
    </Button>
  );
}

export function StructuredSummarySections({
  summary,
  onRegenerate,
  isRegenerating,
}: StructuredSummaryProps) {
  if (summary.meta?.kind === "insufficient") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="size-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
          <ClipboardListIcon className="size-7" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Not enough conversation to summarize
          </p>
          <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed">
            This call was too short to produce a reliable summary, so no
            content was generated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {summary.meta?.kind === "fallback" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangleIcon className="size-4 text-amber-600" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium leading-relaxed">
              The AI response failed schema validation twice, so an
              overview-only summary was stored instead. Nothing invalid was
              saved.
            </p>
            {onRegenerate && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="w-fit rounded-lg text-xs font-semibold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 gap-2"
              >
                <RefreshCwIcon className="size-3.5" />
                {isRegenerating ? "Regenerating..." : "Regenerate summary"}
              </Button>
            )}
          </div>
        </div>
      )}

      {summary.coaching && (
        <CoachingReport coaching={summary.coaching} />
      )}

      <Section title="Overview" icon={<ClipboardListIcon className="size-3.5" />}>
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-200">
            {summary.overview}
          </p>
        </div>
      </Section>

      {!summary.coaching && summary.decisions.length > 0 && (
        <Section
          title="Key decisions"
          icon={<CheckCircle2Icon className="size-3.5" />}
        >
          <ul className="flex flex-col gap-3">
            {summary.decisions.map((decision) => (
              <li
                key={decision}
                className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed p-3 rounded-lg bg-emerald-50 border border-emerald-200"
              >
                <div className="size-5 rounded-md bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2Icon className="size-3.5 text-white" />
                </div>
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!summary.coaching && summary.actionItems.length > 0 && (
        <Section
          title="Action items"
          icon={<ClipboardListIcon className="size-3.5" />}
        >
          <ul className="flex flex-col gap-3">
            {summary.actionItems.map((item, index) => (
              <li
                key={`${item.task}-${index}`}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors shadow-sm"
              >
                <div className="size-5 rounded-md border-2 border-slate-300 shrink-0 mt-0.5" />
                <div className="flex flex-1 flex-col gap-2.5">
                  <span className="text-sm text-slate-900 font-medium leading-relaxed">
                    {item.task}
                  </span>
                  {(item.owner || item.dueDate) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {item.owner && (
                        <Badge
                          variant="neutral"
                          className="bg-brand-50 text-brand-800 border border-brand-200 font-semibold px-2.5 py-1"
                        >
                          {item.owner}
                        </Badge>
                      )}
                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                          <CalendarIcon className="size-3.5" />
                          {item.dueDate}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.topics.length > 0 && (
        <Section title="Topics" icon={<TagIcon className="size-3.5" />}>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="rounded-lg border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {topic}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {!summary.coaching && summary.openQuestions.length > 0 && (
        <Section
          title="Open questions"
          icon={<HelpCircleIcon className="size-3.5" />}
        >
          <ul className="flex flex-col gap-3">
            {summary.openQuestions.map((question) => (
              <li
                key={question}
                className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed p-3 rounded-lg bg-blue-50 border border-blue-200"
              >
                <div className="size-5 rounded-md bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircleIcon className="size-3.5 text-white" />
                </div>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
