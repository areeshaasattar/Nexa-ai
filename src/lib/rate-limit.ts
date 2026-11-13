import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LIMITS } from "@/lib/limits";

export type RateLimitName =
  | "chat.minute"
  | "chat.day"
  | "createCall.hour"
  | "createCall.day"
  | "getToken.hour"
  | "retrySummary.hour"
  | "retrySummary.dayPerMeeting"
  | "feedback.create.hour"
  | "quickStart.hour"
  | "logVoiceInteraction.hour"
  | "email.resendVerification.window"
  | "email.resendVerification.day"
  | "email.global.day";

export interface CheckLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimitBackend {
  limit(name: RateLimitName, key: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
  getRemaining?: (name: RateLimitName, key: string) => Promise<{ limit: number; remaining: number; reset: number }>;
}

type LimiterConfig = {
  tokens: number;
  window: Parameters<typeof Ratelimit.slidingWindow>[1];
  kind: "sliding" | "fixed";
  prefix: string;
};

const LIMITER_CONFIG: Record<RateLimitName, LimiterConfig> = {
  "chat.minute": { tokens: LIMITS.chat.perMinute, window: "1 m", kind: "sliding", prefix: "nexa:rl:chat.minute" },
  "chat.day": { tokens: LIMITS.chat.perDay, window: "1 d", kind: "fixed", prefix: "nexa:rl:chat.day" },
  "createCall.hour": { tokens: LIMITS.createCall.perHour, window: "1 h", kind: "sliding", prefix: "nexa:rl:createCall.hour" },
  "createCall.day": { tokens: LIMITS.createCall.perDay, window: "1 d", kind: "fixed", prefix: "nexa:rl:createCall.day" },
  "getToken.hour": { tokens: LIMITS.getToken.perHour, window: "1 h", kind: "sliding", prefix: "nexa:rl:getToken.hour" },
  "retrySummary.hour": { tokens: LIMITS.retrySummary.perHourPerUser, window: "1 h", kind: "sliding", prefix: "nexa:rl:retrySummary.hour" },
  "retrySummary.dayPerMeeting": { tokens: LIMITS.retrySummary.perDayPerMeeting, window: "1 d", kind: "fixed", prefix: "nexa:rl:retrySummary.dayPerMeeting" },
  "feedback.create.hour": { tokens: LIMITS.feedback.createPerHour, window: "1 h", kind: "sliding", prefix: "nexa:rl:feedback.create.hour" },
  "quickStart.hour": { tokens: LIMITS.quickStart.perHour, window: "1 h", kind: "sliding", prefix: "nexa:rl:quickStart.hour" },
  "logVoiceInteraction.hour": { tokens: LIMITS.logVoiceInteraction.perHour, window: "1 h", kind: "sliding", prefix: "nexa:rl:logVoiceInteraction.hour" },
  "email.resendVerification.window": { tokens: 1, window: "60 s", kind: "sliding", prefix: "nexa:rl:email.resendVerification.window" },
  "email.resendVerification.day": { tokens: LIMITS.email.resendVerificationPerDay, window: "1 d", kind: "fixed", prefix: "nexa:rl:email.resendVerification.day" },
  "email.global.day": { tokens: LIMITS.email.globalPerDay, window: "1 d", kind: "fixed", prefix: "nexa:rl:email.global.day" },
};

let redisClient: Redis | null = null;
const limiterCache = new Map<RateLimitName, Ratelimit>();
let missingConfigLogged = false;
let testBackend: RateLimitBackend | null = null;

function hasUpstashEnv(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function logMissingConfigOnce(): void {
  if (missingConfigLogged) return;
  missingConfigLogged = true;
  if (process.env.NODE_ENV === "production") {
    console.error("[rate-limit] Upstash not configured, limits disabled (production)");
  } else {
    console.info("[rate-limit] Upstash not configured, limits disabled (dev)");
  }
}

function getRedis(): Redis | null {
  if (!hasUpstashEnv()) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

function getLimiter(name: RateLimitName): Ratelimit | null {
  const cached = limiterCache.get(name);
  if (cached) return cached;

  const redis = getRedis();
  if (!redis) return null;

  const config = LIMITER_CONFIG[name];
  const algorithm =
    config.kind === "fixed"
      ? Ratelimit.fixedWindow(config.tokens, config.window)
      : Ratelimit.slidingWindow(config.tokens, config.window);

  const limiter = new Ratelimit({
    redis,
    limiter: algorithm,
    prefix: config.prefix,
    analytics: true,
  });
  limiterCache.set(name, limiter);
  return limiter;
}

function toResult(
  name: RateLimitName,
  res: { success: boolean; remaining: number; reset: number; limit?: number; reason?: string },
): CheckLimitResult {
  let resetAt = typeof res.reset === "number" ? res.reset : Date.now();
  const isTimeoutFailOpen =
    res.success === true &&
    (res.reason === "timeout" || (res.reset === 0 && res.limit === 0));

  if (isTimeoutFailOpen) {
    // Upstash timed out and failed open; keep allow/deny behavior but make reset sane.
    console.warn(JSON.stringify({ event: "rate_limit.timeout", limiter: name }));
    resetAt = Date.now() + 60_000;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return {
    allowed: res.success,
    remaining: Math.max(0, res.remaining ?? 0),
    resetAt,
    retryAfterSeconds,
  };
}

function failOpenResult(name: RateLimitName): CheckLimitResult {
  const config = LIMITER_CONFIG[name];
  return {
    allowed: true,
    remaining: config.tokens,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 60,
  };
}

/**
 * Inject a backend for unit tests (no network). Pass null to restore default behavior.
 */
export function setRateLimitBackendForTests(backend: RateLimitBackend | null): void {
  testBackend = backend;
}

export async function checkLimit(name: RateLimitName, key: string): Promise<CheckLimitResult> {
  if (testBackend) {
    try {
      const res = await testBackend.limit(name, key);
      return toResult(name, res);
    } catch {
      console.warn(JSON.stringify({ event: "rate_limit.error", limiter: name, mode: "test_fail_open" }));
      return failOpenResult(name);
    }
  }

  if (!hasUpstashEnv()) {
    logMissingConfigOnce();
    return failOpenResult(name);
  }

  try {
    const limiter = getLimiter(name);
    if (!limiter) {
      logMissingConfigOnce();
      return failOpenResult(name);
    }
    const res = await limiter.limit(key);
    const result = toResult(name, res as unknown as { success: boolean; remaining: number; reset: number; limit?: number; reason?: string });
    // Structured log for observability (no secrets/emails).
    console.info(
      JSON.stringify({
        event: "rate_limit.check",
        limiter: name,
        userId: key,
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt,
      }),
    );
    return result;
  } catch {
    // Fail open on limiter errors (including global email budget and daily chat cap).
    console.warn(JSON.stringify({ event: "rate_limit.error", limiter: name, allowed: true }));
    return failOpenResult(name);
  }
}

export async function getRemainingLimit(
  name: RateLimitName,
  key: string,
): Promise<CheckLimitResult> {
  if (testBackend) {
    try {
      if (testBackend.getRemaining) {
        const res = await testBackend.getRemaining(name, key);
        const allowed = (res.remaining ?? 0) > 0;
        return toResult(name, {
          success: allowed,
          remaining: res.remaining,
          reset: res.reset,
          limit: res.limit,
        });
      }
      // No peek support in test backend; conservatively allow without consuming.
      return failOpenResult(name);
    } catch {
      console.warn(JSON.stringify({ event: "rate_limit.error", limiter: name, mode: "test_fail_open_peek" }));
      return failOpenResult(name);
    }
  }

  if (!hasUpstashEnv()) {
    logMissingConfigOnce();
    return failOpenResult(name);
  }

  try {
    const limiter = getLimiter(name);
    if (!limiter) {
      logMissingConfigOnce();
      return failOpenResult(name);
    }
    const res = await (limiter as unknown as { getRemaining: (id: string) => Promise<{ limit: number; remaining: number; reset: number }> }).getRemaining(key);
    const allowed = (res.remaining ?? 0) > 0;
    return toResult(name, {
      success: allowed,
      remaining: res.remaining,
      reset: res.reset,
      limit: res.limit,
    });
  } catch {
    console.warn(JSON.stringify({ event: "rate_limit.error", limiter: name, allowed: true, op: "getRemaining" }));
    return failOpenResult(name);
  }
}

// Backward-compatible helper used by existing code paths.
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  const result = await checkLimit("chat.minute", userId);
  return {
    success: result.allowed,
    limit: LIMITS.chat.perMinute,
    remaining: result.remaining,
    reset: result.resetAt,
  };
}