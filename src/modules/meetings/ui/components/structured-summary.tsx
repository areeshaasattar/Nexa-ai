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
    <section className="flex flex-col gap-3">
      <h4 className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <span className="text-[#3B6D11]">{icon}</span>
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
      className="rounded-lg text-xs font-bold border-gray-200 text-gray-500 hover:bg-gray-50 gap-1.5"
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {copied ? "Copied" : "Copy as Markdown"}
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
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
          <ClipboardListIcon className="size-6" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            Not enough conversation to summarize
          </p>
          <p className="text-xs text-gray-400 max-w-[260px] mt-1">
            This call was too short to produce a reliable summary, so no
            content was generated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {summary.meta?.kind === "fallback" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-700">
          <AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold leading-relaxed">
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
                className="w-fit rounded-lg text-xs border-amber-200 text-amber-700 hover:bg-amber-100 gap-1.5"
              >
                <RefreshCwIcon className="size-3.5" />
                {isRegenerating ? "Regenerating..." : "Regenerate summary"}
              </Button>
            )}
          </div>
        </div>
      )}

      <Section title="Overview" icon={<ClipboardListIcon className="size-3.5" />}>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {summary.overview}
        </p>
      </Section>

      {summary.decisions.length > 0 && (
        <Section
          title="Key decisions"
          icon={<CheckCircle2Icon className="size-3.5" />}
        >
          <ul className="flex flex-col gap-2.5">
            {summary.decisions.map((decision) => (
              <li
                key={decision}
                className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed"
              >
                <CheckCircle2Icon className="size-4 mt-0.5 shrink-0 text-[#3B6D11]" />
                <span>{decision}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.actionItems.length > 0 && (
        <Section
          title="Action items"
          icon={<ClipboardListIcon className="size-3.5" />}
        >
          <ul className="flex flex-col gap-3">
            {summary.actionItems.map((item, index) => (
              <li
                key={`${item.task}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3"
              >
                <CircleIcon className="size-4 mt-0.5 shrink-0 text-gray-300" />
                <div className="flex flex-1 flex-col gap-2">
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {item.task}
                  </span>
                  {(item.owner || item.dueDate) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {item.owner && (
                        <Badge
                          variant="secondary"
                          className="bg-[#f0f4f0] text-[#3B6D11] border border-[#d4e0d4]"
                        >
                          {item.owner}
                        </Badge>
                      )}
                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                          <CalendarIcon className="size-3" />
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
                className="rounded-full border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600"
              >
                {topic}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {summary.openQuestions.length > 0 && (
        <Section
          title="Open questions"
          icon={<HelpCircleIcon className="size-3.5" />}
        >
          <ul className="flex flex-col gap-2.5">
            {summary.openQuestions.map((question) => (
              <li
                key={question}
                className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed"
              >
                <HelpCircleIcon className="size-4 mt-0.5 shrink-0 text-gray-400" />
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
