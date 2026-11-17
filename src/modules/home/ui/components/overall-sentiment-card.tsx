"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Sentiment breakdown proportions derived from stored AI meeting summaries.
 * The server returns raw counts of meetings classified as positive, natural
 * or negative; this component normalizes them. When no summarized meetings
 * exist (or a summary predates sentiment analysis), the card renders an
 * empty state.
 */
export interface SentimentBreakdown {
  positive: number;
  natural: number;
  negative: number;
}

/** Three green shades matching the template. */
const SENTIMENT_META = [
  { key: "positive", label: "Positive", color: "#0B3D2E", dotClass: "bg-green-900" },
  { key: "natural", label: "Natural", color: "#2FA36B", dotClass: "bg-green-600" },
  { key: "negative", label: "Negative", color: "#A8E0C0", dotClass: "bg-green-200" },
] as const;

const EMPTY_TRACK_COLOR = "#E5EDE8";

function SentimentDonut({
  breakdown,
  size = 76,
  strokeWidth = 12,
}: {
  breakdown: SentimentBreakdown | null;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = breakdown
    ? breakdown.positive + breakdown.natural + breakdown.negative
    : 0;
  const hasData = total > 0;

  let accumulated = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Overall sentiment distribution"
      className="shrink-0"
    >
      {/* Track also serves as the empty-state ring. */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={EMPTY_TRACK_COLOR}
        strokeWidth={strokeWidth}
      />
      {hasData &&
        breakdown &&
        SENTIMENT_META.map(({ key, color }) => {
          const fraction = Math.min(Math.max(breakdown[key] / total, 0), 1);
          if (fraction <= 0) return null;
          const segment = (
            <circle
              key={key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${fraction * circumference} ${circumference}`}
              strokeDashoffset={-accumulated * circumference}
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
          accumulated += fraction;
          return segment;
        })}
    </svg>
  );
}

export const OverallSentimentCard = ({
  sentiment,
}: {
  sentiment?: SentimentBreakdown | null;
}) => {
  const total = sentiment
    ? sentiment.positive + sentiment.natural + sentiment.negative
    : 0;
  const hasData = total > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      {/* Header */}
      <div>
        <div className="text-[15px] font-semibold text-gray-900 leading-tight">Overall Sentiment</div>
        <div className="text-[11px] text-gray-500 mt-0.5">Meeting mood analysis</div>
      </div>

      {/* Body */}
      <div className="flex items-center justify-between gap-4 mt-2">
        {/* Legend - Left */}
        <div className="space-y-1.5 flex-1">
          {SENTIMENT_META.map(({ key, label, dotClass }) => (
            <div key={key} className="flex items-center justify-between min-w-[110px]">
              <div className="flex items-center gap-2">
                <div className={`size-1.5 rounded-full ${dotClass}`} />
                <span className="text-xs text-gray-700">{label}</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {hasData ? `${Math.round((sentiment![key] / total) * 100)}%` : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Donut - Right */}
        <div className="shrink-0" title={!hasData ? "Sentiment appears here once meetings have AI summaries" : undefined}>
          <SentimentDonut breakdown={hasData ? sentiment! : null} />
        </div>
      </div>
    </div>
  );
};
