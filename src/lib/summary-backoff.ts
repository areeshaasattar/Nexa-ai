export type ProviderFailureKind =
  | "rate_limited"
  | "server_error"
  | "network"
  | "timeout"
  | "non_retryable"
  | "unknown";

export const SUMMARY_PROVIDER_MAX_ATTEMPTS = 4;
export const SUMMARY_PROVIDER_BASE_DELAYS_MS = [2000, 6000, 15000] as const;
export const SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS = 20000;
export const SUMMARY_PROVIDER_JITTER_RATIO = 0.2; // +/-20%

export function isRetryableProviderStatus(
  status: number | "network" | "timeout",
): boolean {
  if (status === 429) return true;
  if (status === "network" || status === "timeout") return true;
  if (typeof status === "number" && status >= 500 && status <= 599) return true;
  return false;
}

export function isNonRetryableProviderStatus(
  status: number | "network" | "timeout",
): boolean {
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404
  );
}

export function classifyProviderFailure(
  status: number | "network" | "timeout",
): ProviderFailureKind {
  if (status === 429) return "rate_limited";
  if (status === "network") return "network";
  if (status === "timeout") return "timeout";
  if (typeof status === "number" && status >= 500) return "server_error";
  if (isNonRetryableProviderStatus(status)) return "non_retryable";
  return "unknown";
}

export function parseRetryAfterMs(
  header: string | null | undefined,
  nowMs = Date.now(),
  capMs = SUMMARY_PROVIDER_RETRY_AFTER_CAP_MS,
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    const ms = Math.max(0, Math.round(seconds * 1000));
    return Math.min(ms, capMs);
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    const ms = Math.max(0, dateMs - nowMs);
    return Math.min(ms, capMs);
  }

  return null;
}

export function jitterDelayMs(
  baseMs: number,
  randomValue = Math.random(),
  jitterRatio = SUMMARY_PROVIDER_JITTER_RATIO,
): number {
  const clampedRandom = Math.min(1, Math.max(0, randomValue));
  const factor = 1 + (clampedRandom * 2 - 1) * jitterRatio;
  return Math.max(0, Math.round(baseMs * factor));
}

export function getProviderRetryDelayMs(options: {
  retryIndex: number; // 1-based retry number (1 => after first failure)
  retryAfterHeader?: string | null;
  nowMs?: number;
  randomValue?: number;
}): number {
  const { retryIndex, retryAfterHeader, nowMs = Date.now(), randomValue } = options;
  const base =
    SUMMARY_PROVIDER_BASE_DELAYS_MS[
      Math.min(retryIndex - 1, SUMMARY_PROVIDER_BASE_DELAYS_MS.length - 1)
    ] ?? SUMMARY_PROVIDER_BASE_DELAYS_MS[SUMMARY_PROVIDER_BASE_DELAYS_MS.length - 1];

  const retryAfter = parseRetryAfterMs(retryAfterHeader, nowMs);
  if (retryAfter != null) {
    return retryAfter;
  }
  return jitterDelayMs(base, randomValue);
}

export function shouldRetryProviderFailure(options: {
  status: number | "network" | "timeout";
  attempt: number; // 1-based attempt that just failed
  maxAttempts?: number;
}): boolean {
  const { status, attempt, maxAttempts = SUMMARY_PROVIDER_MAX_ATTEMPTS } = options;
  if (attempt >= maxAttempts) return false;
  if (isNonRetryableProviderStatus(status)) return false;
  return isRetryableProviderFailure(status);
}

export function isRetryableProviderFailure(
  status: number | "network" | "timeout",
): boolean {
  return isRetryableProviderStatus(status);
}
