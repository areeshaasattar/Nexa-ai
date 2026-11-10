import assert from "node:assert/strict";
import { mapProviderError, shouldRetryProviderFailure } from "../src/lib/chat-provider-errors";

function main() {
  // mapProviderError cases
  assert.deepEqual(mapProviderError(429), {
    code: "provider_busy",
    message: "The AI is busy right now. Please try again in a few seconds.",
    retryable: true,
  });

  for (const status of [500, 503] as const) {
    assert.deepEqual(mapProviderError(status), {
      code: "provider_unavailable",
      message: "The AI is temporarily unavailable. Please try again.",
      retryable: true,
    });
  }

  for (const status of [401, 400] as const) {
    assert.deepEqual(mapProviderError(status), {
      code: "provider_error",
      message: "Something went wrong with the AI. Please try again.",
      retryable: false,
    });
  }

  for (const status of ["network", "timeout"] as const) {
    assert.deepEqual(mapProviderError(status), {
      code: "provider_unavailable",
      message: "The AI is temporarily unavailable. Please try again.",
      retryable: true,
    });
  }

  // Retry decision: retry on 429/5xx/network once (before stream starts)
  for (const status of [429, 500, 503, "network", "timeout"] as const) {
    assert.equal(shouldRetryProviderFailure(status, 1, false), true, `should retry once on ${status}`);
    assert.equal(shouldRetryProviderFailure(status, 2, false), false, `at most one retry on ${status}`);
  }

  // No retry on 400/401
  for (const status of [400, 401] as const) {
    assert.equal(shouldRetryProviderFailure(status, 1, false), false, `no retry on ${status}`);
  }

  // No retry after stream started
  for (const status of [429, 500, "network", "timeout"] as const) {
    assert.equal(shouldRetryProviderFailure(status, 1, true), false, `no retry after stream started on ${status}`);
  }

  console.log(
    JSON.stringify(
      {
        event: "test.chat_errors.pass",
        checks: [
          "mapProviderError_429_500_503_401_400_network_timeout",
          "retry_once_on_429_5xx_network_timeout",
          "no_retry_on_400_401",
          "no_retry_after_stream_started",
          "at_most_one_retry",
        ],
      },
      null,
      2,
    ),
  );
}

main();
