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

/** Three green shades, reused from the Meeting Status donut palette. */
const SENTIMENT_META = [
  { key: "positive", label: "Positive", color: "#14533a", dotClass: "bg-brand-800" },
  { key: "natural", label: "Natural", color: "#55b884", dotClass: "bg-brand-400" },
  { key: "negative", label: "Negative", color: "#b9e6cb", dotClass: "bg-brand-200" },
] as const;

const EMPTY_TRACK_COLOR = "#e1ece5";

function SentimentDonut({
  breakdown,
  size = 104,
  strokeWidth = 14,
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
    <Card className="rounded-2xl border border-brand-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Overall Sentiment</CardTitle>
        <CardDescription className="text-xs text-text-muted mt-1">
          Meeting mood analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2 text-xs">
            {SENTIMENT_META.map(({ key, label, dotClass }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${dotClass}`} />
                  <span className="text-text-muted">{label}</span>
                </div>
                <span className="font-medium text-text">
                  {hasData
                    ? `${Math.round((sentiment![key] / total) * 100)}%`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
          <SentimentDonut breakdown={hasData ? sentiment! : null} />
        </div>
        {!hasData && (
          <p className="mt-3 text-[11px] text-text-subtle">
            Sentiment appears here once meetings have AI summaries.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
