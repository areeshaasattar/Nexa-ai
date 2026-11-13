/**
 * Small provider layer for LLM calls.
 *
 * Primary provider is selected by LLM_PRIMARY ("mistral" default or "groq").
 * The other provider is used as fallback when configured and enabled.
 *
 * Fallback is active only when LLM_FALLBACK_ENABLED is not "false" AND the
 * fallback provider is fully configured (key + model). Env vars are read at
 * call time. No new dependencies: uses fetch. No module-top-level env reads.
 */

export type LlmProvider = "mistral" | "groq";
export type LlmPurpose = "chat" | "summary";

export interface LlmMessage {
  role: string;
  content: string;
}

export interface CallLLMOptions {
  messages: LlmMessage[];
  stream?: boolean;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  purpose?: LlmPurpose;
  // Injectable for tests:
  now?: (() => number) | number;
  nowMs?: (() => number) | number;
  clock?: (() => number) | number;
  fetch?: typeof fetch;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  sleepFn?: (ms: number) => Promise<void>;
}

export interface CallLLMResult {
  response: Response;
  provider: LlmProvider;
}

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const CB_RATE_MS = 60_000;
const CB_AUTH_MS = 300_000;

interface CircuitState {
  provider: LlmProvider;
  trippedUntil: number;
  reason: number | "network" | "timeout";
}

let circuit: CircuitState | null = null;
const notConfiguredLogged = new Set<LlmProvider>();

export function resetLlmCircuitBreaker(): void {
  circuit = null;
  notConfiguredLogged.clear();
}

export function getLlmCircuitState(now?: number): CircuitState | null {
  const t = now ?? Date.now();
  if (circuit && circuit.trippedUntil <= t) {
    circuit = null;
  }
  return circuit;
}

function resolveNow(opts: CallLLMOptions): () => number {
  const n = opts.now ?? opts.nowMs ?? opts.clock;
  if (typeof n === "function") return n as () => number;
  if (typeof n === "number") return () => n;
  return () => Date.now();
}

function resolveFetch(opts: CallLLMOptions): typeof fetch {
  return (opts.fetch ?? opts.fetchImpl ?? globalThis.fetch) as typeof fetch;
}

function resolveSleep(opts: CallLLMOptions): (ms: number) => Promise<void> {
  const s = opts.sleep ?? opts.sleepFn;
  if (s) return s;
  return (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
}

function providerConfig(provider: LlmProvider): { apiKey: string; model: string; url: string } {
  if (provider === "groq") {
    return {
      apiKey: process.env.GROQ_API_KEY?.trim() ?? "",
      model: process.env.GROQ_MODEL_NAME?.trim() ?? "",
      url: GROQ_URL,
    };
  }
  return {
    apiKey: process.env.MISTRAL_API_KEY?.trim() ?? "",
    model: process.env.MODEL_NAME?.trim() || "mistral-small-latest",
    url: MISTRAL_URL,
  };
}

function isConfigured(provider: LlmProvider): boolean {
  const cfg = providerConfig(provider);
  return Boolean(cfg.apiKey && cfg.model);
}

function primaryProvider(): LlmProvider {
  return process.env.LLM_PRIMARY?.trim().toLowerCase() === "groq" ? "groq" : "mistral";
}

function otherProvider(p: LlmProvider): LlmProvider {
  return p === "groq" ? "mistral" : "groq";
}

function isFallbackEnabled(): boolean {
  if (process.env.LLM_FALLBACK_ENABLED === "false") return false;
  return true;
}

function isFallbackEligible(status: number | "network" | "timeout"): boolean {
  if (status === 429) return true;
  if (status === "network" || status === "timeout") return true;
  if (typeof status === "number" && status >= 500) return true;
  if (status === 401 || status === 403) return true;
  return false;
}

function tripCircuit(provider: LlmProvider, status: number | "network" | "timeout", now: number): void {
  const ms = status === 401 || status === 403 ? CB_AUTH_MS : CB_RATE_MS;
  circuit = { provider, trippedUntil: now + ms, reason: status };
}

function logNotConfigured(provider: LlmProvider): void {
  if (notConfiguredLogged.has(provider)) return;
  notConfiguredLogged.add(provider);
  console.log(
    JSON.stringify({
      event: "llm.provider_not_configured",
      provider,
    }),
  );
}

function buildBody(
  provider: LlmProvider,
  opts: CallLLMOptions,
): Record<string, unknown> {
  const cfg = providerConfig(provider);
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: opts.messages,
    stream: Boolean(opts.stream),
  };
  if (opts.maxTokens != null) {
    // Correct parameter name per provider (verified against provider docs).
    if (provider === "groq") body.max_completion_tokens = opts.maxTokens;
    else body.max_tokens = opts.maxTokens;
  }
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  if (opts.temperature != null) body.temperature = opts.temperature;
  return body;
}

async function attemptProvider(
  provider: LlmProvider,
  opts: CallLLMOptions,
  fetchFn: typeof fetch,
  combinedSignal: AbortSignal | undefined,
  purpose: LlmPurpose,
  nowFn: () => number,
): Promise<{
  ok: boolean;
  response: Response;
  status: number | "network" | "timeout";
  durationMs: number;
  clientAborted: boolean;
}> {
  const cfg = providerConfig(provider);
  const t0 = nowFn();
  const url = cfg.url;
  const body = buildBody(provider, opts);
  const clientAborted = Boolean(opts.signal?.aborted);

  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
    const durationMs = nowFn() - t0;
    console.log(
      JSON.stringify({
        event: "llm.attempt",
        provider,
        purpose,
        status: res.status,
        durationMs,
      }),
    );
    return { ok: res.ok, response: res, status: res.status, durationMs, clientAborted };
  } catch {
    const durationMs = nowFn() - t0;
    const isTimeout =
      combinedSignal !== undefined &&
      (combinedSignal as AbortSignal).aborted &&
      !clientAborted;
    const finalStatus: "network" | "timeout" = isTimeout ? "timeout" : "network";
    console.log(
      JSON.stringify({
        event: "llm.attempt",
        provider,
        purpose,
        status: finalStatus,
        durationMs,
      }),
    );
    const synth = new Response(null, {
      status: finalStatus === "timeout" ? 504 : 503,
    });
    return { ok: false, response: synth, status: finalStatus, durationMs, clientAborted };
  }
}

export async function callLLM(opts: CallLLMOptions): Promise<CallLLMResult> {
  const purpose: LlmPurpose = opts.purpose ?? "chat";
  const nowFn = resolveNow(opts);
  const fetchFn = resolveFetch(opts);
  const sleepFn = resolveSleep(opts);

  const combinedSignal: AbortSignal | undefined = (() => {
    if (typeof AbortSignal === "undefined") return opts.signal;
    const timeoutSignal =
      typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(20000)
        : undefined;
    if (!timeoutSignal) return opts.signal;
    if (!opts.signal) return timeoutSignal;
    if (typeof AbortSignal.any === "function") {
      return AbortSignal.any([opts.signal, timeoutSignal]);
    }
    return opts.signal;
  })();

  const primary = primaryProvider();
  const fallbackCandidate = otherProvider(primary);

  // Determine configured providers.
  const primaryConfigured = isConfigured(primary);
  const fallbackConfigured = isConfigured(fallbackCandidate);

  // Log not-configured once per process (silent skip).
  if (!primaryConfigured) logNotConfigured(primary);
  if (!fallbackConfigured) logNotConfigured(fallbackCandidate);

  // If primary not configured, try fallback as primary if configured.
  let effectivePrimary: LlmProvider = primary;
  if (!primaryConfigured && fallbackConfigured) {
    effectivePrimary = fallbackCandidate;
  }

  const effectiveFallback: LlmProvider | null =
    effectivePrimary === primary
      ? (fallbackConfigured && isFallbackEnabled() ? fallbackCandidate : null)
      : null;

  // If no provider configured at all.
  if (!isConfigured(effectivePrimary) && !(effectiveFallback && isConfigured(effectiveFallback))) {
    // Actually check both.
  }
  const anyConfigured = isConfigured("mistral") || isConfigured("groq");
  if (!anyConfigured) {
    const missing: string[] = [];
    if (!process.env.MISTRAL_API_KEY?.trim()) missing.push("MISTRAL_API_KEY");
    if (!process.env.MODEL_NAME?.trim()) missing.push("MODEL_NAME");
    if (!process.env.GROQ_API_KEY?.trim()) missing.push("GROQ_API_KEY");
    if (!process.env.GROQ_MODEL_NAME?.trim()) missing.push("GROQ_MODEL_NAME");
    console.error(
      JSON.stringify({
        event: "llm.no_provider_configured",
        missing,
      }),
    );
    return { response: new Response(null, { status: 400 }), provider: primary };
  }

  // If effectivePrimary not configured but fallback is, swap.
  if (!isConfigured(effectivePrimary) && effectiveFallback && isConfigured(effectiveFallback)) {
    effectivePrimary = effectiveFallback;
  }

  // Circuit breaker.
  const cbState = getLlmCircuitState(nowFn());
  const primaryTripped =
    Boolean(cbState && cbState.provider === effectivePrimary && cbState.trippedUntil > nowFn());

  let usePrimary = !primaryTripped;
  if (primaryTripped && !effectiveFallback) usePrimary = true;

  let lastResponse: Response | null = null;
  let lastStatus: number | "network" | "timeout" = "network";
  let lastProvider: LlmProvider = effectivePrimary;
  let primaryAttempted = false;
  let primaryEligibleForFallback = false;

  if (usePrimary && isConfigured(effectivePrimary)) {
    primaryAttempted = true;
    const r1 = await attemptProvider(effectivePrimary, opts, fetchFn, combinedSignal, purpose, nowFn);
    lastResponse = r1.response;
    lastStatus = r1.status;
    lastProvider = effectivePrimary;

    if (r1.ok) {
      resetLlmCircuitBreaker();
      return { response: r1.response, provider: effectivePrimary };
    }
    if (r1.clientAborted) {
      return { response: r1.response, provider: effectivePrimary };
    }

    primaryEligibleForFallback = isFallbackEligible(r1.status);
    if (isFallbackEligible(r1.status)) {
      tripCircuit(effectivePrimary, r1.status, nowFn());
    }
    if (r1.status === 401 || r1.status === 403) {
      console.error(
        JSON.stringify({ event: "llm.primary_misconfigured", status: r1.status }),
      );
    }

    const retryablePrimary =
      r1.status === 429 ||
      (typeof r1.status === "number" && r1.status >= 500) ||
      r1.status === "network" ||
      r1.status === "timeout";

    if (retryablePrimary) {
      await sleepFn(800);
      const r2 = await attemptProvider(effectivePrimary, opts, fetchFn, combinedSignal, purpose, nowFn);
      lastResponse = r2.response;
      lastStatus = r2.status;
      lastProvider = effectivePrimary;

      if (r2.ok) {
        resetLlmCircuitBreaker();
        return { response: r2.response, provider: effectivePrimary };
      }
      if (r2.clientAborted) {
        return { response: r2.response, provider: effectivePrimary };
      }
      primaryEligibleForFallback = isFallbackEligible(r2.status);
      if (isFallbackEligible(r2.status)) {
        tripCircuit(effectivePrimary, r2.status, nowFn());
      }
      if (r2.status === 401 || r2.status === 403) {
        console.error(
          JSON.stringify({ event: "llm.primary_misconfigured", status: r2.status }),
        );
      }
    }
  } else if (primaryTripped) {
    primaryEligibleForFallback = true;
    lastStatus = circuit?.reason ?? 429;
    lastProvider = effectivePrimary;
  }

  // Fallback.
  const fallbackProvider = effectiveFallback;
  const canFallback =
    fallbackProvider !== null &&
    isConfigured(fallbackProvider) &&
    isFallbackEnabled() &&
    (primaryEligibleForFallback || primaryTripped || !primaryAttempted) &&
    !opts.signal?.aborted;

  if (canFallback && fallbackProvider) {
    const reason = primaryTripped ? circuit?.reason ?? lastStatus : lastStatus;
    console.log(
      JSON.stringify({
        event: "llm.fallback_used",
        from: effectivePrimary,
        to: fallbackProvider,
        reason,
      }),
    );
    const gr = await attemptProvider(fallbackProvider, opts, fetchFn, combinedSignal, purpose, nowFn);
    lastResponse = gr.response;
    lastStatus = gr.status;
    lastProvider = fallbackProvider;

    if (gr.ok) {
      return { response: gr.response, provider: fallbackProvider };
    }
    if (gr.clientAborted) {
      return { response: gr.response, provider: fallbackProvider };
    }
  }

  if (!lastResponse) {
    lastResponse = new Response(null, { status: 400 });
  }
  return { response: lastResponse, provider: lastProvider };
}