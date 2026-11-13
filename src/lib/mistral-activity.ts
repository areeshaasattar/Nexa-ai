/**
 * Best-effort, in-process coordination to avoid summary/provider bursts
 * overlapping with active chat requests for the same user.
 */

const CHAT_ACTIVITY_WINDOW_MS = 3000;
const CHAT_ACTIVITY_TTL_MS = 30_000;
const SUMMARY_INITIAL_DELAY_MS = 3000;

const lastChatMistralActivityByUser = new Map<string, number>();

function cleanup(now = Date.now()) {
  for (const [userId, ts] of lastChatMistralActivityByUser) {
    if (now - ts > CHAT_ACTIVITY_TTL_MS) {
      lastChatMistralActivityByUser.delete(userId);
    }
  }
}

export function markChatMistralActivity(userId: string, at = Date.now()): void {
  lastChatMistralActivityByUser.set(userId, at);
  if (lastChatMistralActivityByUser.size > 200) cleanup(at);
}

export function clearChatMistralActivity(userId: string): void {
  lastChatMistralActivityByUser.delete(userId);
}

export function getLastChatMistralActivity(userId: string): number | null {
  return lastChatMistralActivityByUser.get(userId) ?? null;
}

export function getRecentChatMistralActivityAgeMs(
  userId: string,
  now = Date.now(),
): number | null {
  const ts = lastChatMistralActivityByUser.get(userId);
  if (ts == null) return null;
  const age = now - ts;
  if (age > CHAT_ACTIVITY_TTL_MS) {
    lastChatMistralActivityByUser.delete(userId);
    return null;
  }
  return age;
}

export async function waitForChatQuietPeriod(
  userId: string,
  options?: { windowMs?: number; maxWaitMs?: number; pollMs?: number },
): Promise<void> {
  const windowMs = options?.windowMs ?? CHAT_ACTIVITY_WINDOW_MS;
  const maxWaitMs = options?.maxWaitMs ?? windowMs;
  const pollMs = options?.pollMs ?? 250;
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const age = getRecentChatMistralActivityAgeMs(userId);
    if (age == null || age >= windowMs) return;
    const remainingWindow = windowMs - age;
    const remainingBudget = maxWaitMs - (Date.now() - started);
    const delay = Math.max(50, Math.min(pollMs, remainingWindow, remainingBudget));
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SUMMARY_ENDCALL_INITIAL_DELAY_MS = SUMMARY_INITIAL_DELAY_MS;
export { CHAT_ACTIVITY_WINDOW_MS };
