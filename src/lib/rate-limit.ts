import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Centralised rate limiting backed by Upstash Redis.
 *
 * `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
 * from the environment (already present in `.env` / `.env.example`).
 *
 * The prefix `"ratelimit:chat"` namespaces the Redis keys so more limiters can be
 * added later without key collisions.
 */

// One Redis client, shared across all limiters.
const redis = Redis.fromEnv();

/**
 * Chat limiter: 15 requests per 1 minute, sliding window.
 * Analytics is enabled so usage is visible in the Upstash dashboard.
 */
const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 m"),
  prefix: "ratelimit:chat",
  analytics: true,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp (ms) when the limit resets. */
  reset: number;
}

/**
 * Check whether the given user is within their chat rate limit.
 * @param userId the authenticated user to attribute requests to.
 */
export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  const { success, limit, remaining, reset } = await chatRateLimit.limit(userId);
  return { success, limit, remaining, reset };
}