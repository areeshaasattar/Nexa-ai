"use client";

import { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";
import type { MeetingSummary } from "@/lib/summary-schema";
import { Badge } from "@/components/ui/badge";

interface CoachingReportProps {
  coaching: NonNullable<MeetingSummary["coaching"]>;
}

const RUBRIC_LABELS: Record<string, string> = {
  clarity: "Clarity",
  structure: "Structure",
  confidence: "Confidence",
  answerQuality: "Answer Quality",
};

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100;
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-slate-400";
  
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-bold text-slate-900 w-12 text-right">
        {score}/{max}
      </span>
    </div>
  );
}

function BetterAnswerCard({
  question,
  yourAnswer,
  suggestedAnswer,
}: {
  question: string;
  yourAnswer: string;
  suggestedAnswer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden hover:border-slate-300 transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-100/50 transition-colors"
      >
        <div className="size-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
          <SparklesIcon className="size-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
            {question}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          {isOpen ? (
            <ChevronUpIcon className="size-5 text-slate-400" />
          ) : (
            <ChevronDownIcon className="size-5 text-slate-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 bg-white border-t border-slate-200">
          <div className="pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-slate-400"></span>
              You said
            </p>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-200">
              {yourAnswer}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500"></span>
              Try this instead
            </p>
            <p className="text-sm text-slate-900 leading-relaxed bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              {suggestedAnswer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CoachingReport({ coaching }: CoachingReportProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Overall Score Card */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <TrendingUpIcon className="size-4 text-white" />
            </div>
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Interview Performance
            </h3>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-emerald-900">
              {coaching.overallScore}
            </span>
            <span className="text-base font-semibold text-emerald-600">/10</span>
          </div>
        </div>
        <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${(coaching.overallScore / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Rubric */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-slate-500"></span>
          Detailed Scores
        </h3>
        <div className="space-y-5">
          {coaching.rubric.map((item) => (
            <div key={item.key} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-900 min-w-[130px]">
                  {RUBRIC_LABELS[item.key] || item.key}
                </span>
                <ScoreBar score={item.score} />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed ml-[130px] bg-slate-50 rounded-lg px-3 py-2">
                {item.comment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filler Words */}
      {coaching.fillerWords.total > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <SparklesIcon className="size-4 text-white" />
            </div>
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Filler Words
            </h3>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-amber-900">
              {coaching.fillerWords.total}
            </span>
            <span className="text-sm font-medium text-amber-700">times detected</span>
          </div>
          {coaching.fillerWords.examples.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {coaching.fillerWords.examples.map((word, index) => (
                <Badge
                  key={`${word}-${index}`}
                  variant="outline"
                  className="rounded-lg border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                >
                  {word}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        {coaching.strengths.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <CheckIcon className="size-4 text-white" />
              </div>
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Strengths
              </h3>
            </div>
            <ul className="space-y-3">
              {coaching.strengths.map((strength, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed p-3 rounded-lg bg-emerald-50/50 border border-emerald-100"
                >
                  <CheckIcon className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {coaching.improvements.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="size-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <TrendingUpIcon className="size-4 text-white" />
              </div>
              <h3 className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                Areas for Improvement
              </h3>
            </div>
            <ul className="space-y-3">
              {coaching.improvements.map((improvement, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed p-3 rounded-lg bg-orange-50/50 border border-orange-100"
                >
                  <TrendingUpIcon className="size-4 mt-0.5 shrink-0 text-orange-600" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Better Answers */}
      {coaching.betterAnswers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="size-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <SparklesIcon className="size-4 text-white" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Better Answer Examples
            </h3>
          </div>
          <div className="space-y-3">
            {coaching.betterAnswers.map((answer, index) => (
              <BetterAnswerCard
                key={index}
                question={answer.question}
                yourAnswer={answer.yourAnswer}
                suggestedAnswer={answer.suggestedAnswer}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
