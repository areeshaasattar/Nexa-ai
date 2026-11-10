export type ProviderFailureStatus = number | "network" | "timeout";

export interface ProviderErrorInfo {
  code: "provider_busy" | "provider_unavailable" | "provider_error";
  message: string;
  retryable: boolean;
}

export function mapProviderError(status: ProviderFailureStatus): ProviderErrorInfo {
  if (status === 429) {
    return {
      code: "provider_busy",
      message: "The AI is busy right now. Please try again in a few seconds.",
      retryable: true,
    };
  }
  if (status === "timeout" || status === "network") {
    return {
      code: "provider_unavailable",
      message: "The AI is temporarily unavailable. Please try again.",
      retryable: true,
    };
  }
  if (typeof status === "number" && status >= 500) {
    return {
      code: "provider_unavailable",
      message: "The AI is temporarily unavailable. Please try again.",
      retryable: true,
    };
  }
  if (typeof status === "number" && [400, 401, 403, 404].includes(status)) {
    return {
      code: "provider_error",
      message: "Something went wrong with the AI. Please try again.",
      retryable: false,
    };
  }
  return {
    code: "provider_error",
    message: "Something went wrong with the AI. Please try again.",
    retryable: false,
  };
}

/** Retry once, only before any bytes are streamed to the client. */
export function shouldRetryProviderFailure(
  status: ProviderFailureStatus,
  attempt: number,
  streamStarted: boolean,
): boolean {
  return mapProviderError(status).retryable && attempt === 1 && !streamStarted;
}
