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
  const color = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-amber-500" : "bg-gray-400";
  
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-bold text-gray-700 w-10 text-right">
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
    <div className="rounded-xl border border-gray-200/70 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <SparklesIcon className="size-4 mt-0.5 shrink-0 text-amber-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 leading-relaxed">
            {question}
          </p>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="size-4 mt-0.5 shrink-0 text-gray-400" />
        ) : (
          <ChevronDownIcon className="size-4 mt-0.5 shrink-0 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          <div className="pt-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              You said
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">{yourAnswer}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1.5">
              Try this instead
            </p>
            <p className="text-sm text-gray-700 leading-relaxed bg-green-50/50 rounded-lg p-3 border border-green-100">
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
    <div className="flex flex-col gap-6">
      {/* Overall Score Card */}
      <div className="rounded-2xl border border-gray-200/70 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            Interview Performance
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">
              {coaching.overallScore}
            </span>
            <span className="text-lg font-medium text-gray-400">/10</span>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-800 transition-all duration-500"
            style={{ width: `${(coaching.overallScore / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Rubric */}
      <div className="rounded-2xl border border-gray-200/70 bg-white p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
          Detailed Scores
        </h3>
        <div className="space-y-4">
          {coaching.rubric.map((item) => (
            <div key={item.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-gray-700 min-w-[120px]">
                  {RUBRIC_LABELS[item.key] || item.key}
                </span>
                <ScoreBar score={item.score} />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed pl-[120px]">
                {item.comment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filler Words */}
      {coaching.fillerWords.total > 0 && (
        <div className="rounded-2xl border border-gray-200/70 bg-white p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
            Filler Words
          </h3>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-gray-900">
              {coaching.fillerWords.total}
            </span>
            <span className="text-sm text-gray-500">times</span>
          </div>
          {coaching.fillerWords.examples.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {coaching.fillerWords.examples.map((word, index) => (
                <Badge
                  key={`${word}-${index}`}
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 text-amber-700 text-xs"
                >
                  {word}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {coaching.strengths.length > 0 && (
          <div className="rounded-2xl border border-gray-200/70 bg-white p-6">
            <h3 className="text-sm font-bold text-green-600 uppercase tracking-widest mb-4">
              Strengths
            </h3>
            <ul className="space-y-3">
              {coaching.strengths.map((strength, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed"
                >
                  <CheckIcon className="size-4 mt-0.5 shrink-0 text-green-600" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {coaching.improvements.length > 0 && (
          <div className="rounded-2xl border border-gray-200/70 bg-white p-6">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-4">
              Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {coaching.improvements.map((improvement, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed"
                >
                  <TrendingUpIcon className="size-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Better Answers */}
      {coaching.betterAnswers.length > 0 && (
        <div className="rounded-2xl border border-gray-200/70 bg-white p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            Better Answer Examples
          </h3>
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
