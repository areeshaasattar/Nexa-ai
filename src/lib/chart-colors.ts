/**
 * Plain hex chart colors (single source of truth for chart series/segments).
 *
 * CSS variables (var(--color-chart-*)) do not reliably resolve in SVG
 * presentation attributes or chart-library props, so charts consume these
 * hex constants directly. Keep --chart-* in globals.css in sync with these.
 */
export const CHART_COLORS = {
  dark: "#0B3D2E", // series 1 / Completed / Positive
  mid: "#2FA874", // series 2 / Ongoing / Natural
  light: "#8FD3B2", // series 3 / Scheduled / Negative
  track: "#E5EDE8", // empty ring track (neutral-ish light gray-green)
} as const;