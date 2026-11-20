/**
 * Safe URL validation + bounded fetch helpers.
 *
 * Used by the meeting summary pipeline to fetch transcript assets without
 * allowing SSRF or unbounded downloads. Pure and dependency-free (apart from
 * the global fetch) so it is unit-testable.
 */

export type UrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

export function isIpLiteral(hostname: string): boolean {
  const h = hostname.toLowerCase();
  // IPv6 (with or without brackets)
  if (h.includes(":")) return true;
  // IPv4 dotted quad
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split(".");
    if (parts.every((p) => Number(p) >= 0 && Number(p) <= 255)) return true;
  }
  // decimal / hex / octal integer forms
  if (/^\d+$/.test(h)) return true;
  if (/^0[xX][0-9a-fA-F]+$/.test(h)) return true;
  if (/^0[0-7]+$/.test(h)) return true;
  return false;
}

export function validateAssetUrl(rawUrl: string, allowedHosts: string[]): UrlValidationResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "insecure_protocol" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "credentials_not_allowed" };
  }
  const hostname = url.hostname.toLowerCase();
  if (isIpLiteral(hostname)) {
    return { ok: false, reason: "ip_literal_not_allowed" };
  }
  if (url.port && url.port !== "443") {
    return { ok: false, reason: "port_not_allowed" };
  }

  const hosts = allowedHosts.map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (hosts.length === 0) {
    return { ok: false, reason: "allowlist_empty" };
  }
  const allowed = hosts.some((h) => hostname === h || hostname.endsWith("." + h));
  if (!allowed) {
    return { ok: false, reason: "host_not_allowed" };
  }
  return { ok: true, url };
}

export function getAllowedAssetHosts(): string[] {
  const raw = process.env.STREAM_ASSET_HOSTS || "";
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export type FetchLimitedResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export interface FetchLimitedOptions {
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
}

export async function fetchTextLimited(
  url: string,
  options: FetchLimitedOptions = {},
): Promise<FetchLimitedResult> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxBytes = options.maxBytes ?? 2_000_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  const attempt = async (): Promise<FetchLimitedResult> => {
    let res: Response;
    try {
      res = await fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      return { ok: false, reason: e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network_error" };
    }
    if (res.status >= 300 && res.status < 400) {
      return { ok: false, reason: "redirect" };
    }
    if (res.status >= 500) {
      return { ok: false, reason: `http_${res.status}` };
    }
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }
    if (!res.body) {
      const text = await res.text();
      if (text.length > maxBytes) return { ok: false, reason: "too_large" };
      return { ok: true, text };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          bytes += value.byteLength;
          if (bytes > maxBytes) {
            try { await reader.cancel(); } catch {}
            return { ok: false, reason: "too_large" };
          }
          text += decoder.decode(value, { stream: true });
        }
      }
      text += decoder.decode();
    } catch (e) {
      return { ok: false, reason: e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network_error" };
    }
    return { ok: true, text };
  };

  let result = await attempt();
  const retryable =
    !result.ok &&
    (result.reason === "network_error" ||
      result.reason === "timeout" ||
      /^http_5\d\d$/.test(result.reason));
  if (retryable) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    result = await attempt();
  }
  return result;
}