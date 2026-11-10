import { useCallback, useEffect, useState } from "react";

const DEFAULT_COOLDOWN_SECONDS = 60;

function readEnd(storageKey: string): number | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

function writeEnd(storageKey: string, end: number): void {
  try {
    sessionStorage.setItem(storageKey, String(end));
  } catch {
    // sessionStorage may be unavailable; cooldown still works in memory.
  }
}

export function useResendCooldown(
  storageKey: string,
  cooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stored = readEnd(storageKey);
    if (!stored) return;
    queueMicrotask(() => setEndAt(stored));
  }, [storageKey]);

  useEffect(() => {
    if (!endAt) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= endAt) setEndAt(null);
    };
    queueMicrotask(tick);
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  const start = useCallback(() => {
    const end = Date.now() + cooldownSeconds * 1000;
    writeEnd(storageKey, end);
    setNow(Date.now());
    setEndAt(end);
  }, [cooldownSeconds, storageKey]);

  const remaining = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;
  return {
    start,
    remaining,
    active: remaining > 0,
  };
}
