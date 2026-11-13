import assert from "node:assert/strict";
import { callLLM, resetLlmCircuitBreaker } from "../src/lib/llm";

type FetchStub = (input: unknown, init?: RequestInit) => Promise<Response>;

async function withFetch<T>(stub: FetchStub, fn: () => Promise<T>): Promise<T> {
  const prev = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = prev;
  }
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function captureConsole(): { logs: string[]; errors: string[]; restore: () => void } {
  const logs: string[] = [];
  const errors: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => {
    logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  return {
    logs,
    errors,
    restore: () => {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

async function main() {
  process.env.MISTRAL_API_KEY = "mistral-secret-key";
  process.env.MODEL_NAME = "mistral-small-latest";
  process.env.GROQ_API_KEY = "groq-secret-key";
  process.env.GROQ_MODEL_NAME = "llama-3.3-70b-versatile";
  process.env.LLM_FALLBACK_ENABLED = "true";

  // 1. Primary 200 -> no Groq call
  await withFetch(
    async (input) => {
      const url = String(input);
      if (url.includes("mistral")) return jsonResponse(200, { choices: [{ message: { content: "hi" } }] });
      return jsonResponse(500, {});
    },
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        let calls = 0;
        const stub = globalThis.fetch;
        globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
          calls += 1;
          return (input as string).includes("mistral")
            ? jsonResponse(200, { choices: [{ message: { content: "hi" } }] })
            : jsonResponse(500, {});
        }) as typeof fetch;
        const { response, provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
        });
        assert.equal(provider, "mistral");
        assert.equal(response.status, 200);
        // only one fetch (mistral); groq not called
        assert.equal(calls, 1);
        assert.ok(cap.logs.some((l) => l.includes("llm.attempt") && l.includes("mistral")));
      } finally {
        cap.restore();
      }
    },
  );

  // 2. Primary 429 then Groq 200 -> Groq + fallback log
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        let calls = 0;
        globalThis.fetch = (async (input: unknown) => {
          calls += 1;
          const url = String(input);
          if (url.includes("mistral")) {
            // first two primary attempts (attempt + retry) 429
            return jsonResponse(429, { error: "rate" });
          }
          return jsonResponse(200, { choices: [{ message: { content: "groq hi" } }] });
        }) as typeof fetch;
        const { response, provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
        assert.equal(response.status, 200);
        assert.ok(cap.logs.some((l) => l.includes("llm.fallback_used")));
        assert.ok(cap.logs.some((l) => l.includes("groq")));
      } finally {
        cap.restore();
      }
    },
  );

  // 3. Primary 500 -> fallback
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        globalThis.fetch = (async (input: unknown) => {
          const url = String(input);
          if (url.includes("mistral")) return jsonResponse(500, { error: "boom" });
          return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
        assert.ok(cap.logs.some((l) => l.includes("llm.fallback_used")));
      } finally {
        cap.restore();
      }
    },
  );

  // 4. Primary 401 -> misconfigured error log + fallback
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        globalThis.fetch = (async (input: unknown) => {
          const url = String(input);
          if (url.includes("mistral")) return jsonResponse(401, { error: "bad key" });
          return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
        assert.ok(cap.errors.some((l) => l.includes("llm.primary_misconfigured")));
      } finally {
        cap.restore();
      }
    },
  );

  // 5. Primary 400 -> NO fallback (single fetch)
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        let calls = 0;
        globalThis.fetch = (async (input: unknown) => {
          calls += 1;
          return jsonResponse(400, { error: "bad request" });
        }) as typeof fetch;
        const { response, provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "mistral");
        assert.equal(response.status, 400);
        assert.equal(calls, 1);
        assert.ok(!cap.logs.some((l) => l.includes("llm.fallback_used")));
      } finally {
        cap.restore();
      }
    },
  );

  // 6. Both 429 -> maps to provider_busy (status 429)
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        globalThis.fetch = (async () => jsonResponse(429, { error: "rate" })) as typeof fetch;
        const { response } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(response.status, 429);
      } finally {
        cap.restore();
      }
    },
  );

  // 7. Fallback unconfigured -> no Groq call
  {
    const prevGroq = process.env.GROQ_API_KEY;
    const prevModel = process.env.GROQ_MODEL_NAME;
    const prevEnabled = process.env.LLM_FALLBACK_ENABLED;
    process.env.GROQ_API_KEY = "";
    process.env.GROQ_MODEL_NAME = "";
    process.env.LLM_FALLBACK_ENABLED = "true";
    await withFetch(
      async () => jsonResponse(0),
      async () => {
        resetLlmCircuitBreaker();
        const cap = captureConsole();
        try {
          let calls = 0;
          let groqCalled = false;
          globalThis.fetch = (async (input: unknown) => {
            calls += 1;
            const url = String(input);
            if (url.includes("groq")) groqCalled = true;
            return jsonResponse(429, { error: "rate" });
          }) as typeof fetch;
          const { response, provider } = await callLLM({
            messages: [{ role: "user", content: "hello" }],
            purpose: "chat",
            sleep: async () => {},
          });
          assert.equal(provider, "mistral");
          assert.equal(response.status, 429);
          assert.equal(groqCalled, false);
        } finally {
          cap.restore();
        }
      },
    );
    process.env.GROQ_API_KEY = prevGroq;
    process.env.GROQ_MODEL_NAME = prevModel;
    process.env.LLM_FALLBACK_ENABLED = prevEnabled;
  }

  // 8. Circuit breaker: skip primary for 60s after 429, reset after success
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      let now = 1000;
      const clock = () => now;
      // First call: primary 429 (trips CB)
      globalThis.fetch = (async (input: unknown) => {
        const url = String(input);
        if (url.includes("mistral")) return jsonResponse(429, { error: "rate" });
        return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
      }) as typeof fetch;
      await callLLM({
        messages: [{ role: "user", content: "hello" }],
        purpose: "chat",
        now: clock,
        sleep: async () => {},
      });

      // Within 60s: primary should be skipped (only groq called)
      now = 1000 + 30_000;
      let primaryCalled = false;
      globalThis.fetch = (async (input: unknown) => {
        const url = String(input);
        if (url.includes("mistral")) {
          primaryCalled = true;
          return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
        }
        return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
      }) as typeof fetch;
      await callLLM({
        messages: [{ role: "user", content: "hello" }],
        purpose: "chat",
        now: clock,
        sleep: async () => {},
      });
      assert.equal(primaryCalled, false);

      // After 60s: primary called again; success resets CB
      now = 1000 + 61_000;
      primaryCalled = false;
      globalThis.fetch = (async (input: unknown) => {
        const url = String(input);
        if (url.includes("mistral")) {
          primaryCalled = true;
          return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
        }
        return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
      }) as typeof fetch;
      const { provider } = await callLLM({
        messages: [{ role: "user", content: "hello" }],
        purpose: "chat",
        now: clock,
        sleep: async () => {},
      });
      assert.equal(primaryCalled, true);
      assert.equal(provider, "mistral");
    },
  );

  // 9. Network error and timeout trigger fallback
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      // network
      {
        globalThis.fetch = (async (input: unknown) => {
          const url = String(input);
          if (url.includes("mistral")) throw new Error("network down");
          return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
      }
      // timeout
      resetLlmCircuitBreaker();
      {
        globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("mistral")) {
            const err = new Error("timeout");
            err.name = "TimeoutError";
            throw err;
          }
          return jsonResponse(200, { choices: [{ message: { content: "ok" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
      }
    },
  );

  // 10. No API key in logged output
  await withFetch(
    async () => jsonResponse(0),
    async () => {
      resetLlmCircuitBreaker();
      const cap = captureConsole();
      try {
        globalThis.fetch = (async () => jsonResponse(429, { error: "rate" })) as typeof fetch;
        await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        const allOutput = [...cap.logs, ...cap.errors].join("\n");
        assert.ok(!allOutput.includes("mistral-secret-key"));
        assert.ok(!allOutput.includes("groq-secret-key"));
      } finally {
        cap.restore();
      }
    },
  );

  // LLM_PRIMARY=groq: Groq 200 means no Mistral call
  {
    const prevPrimary = process.env.LLM_PRIMARY;
    const prevMistralKey = process.env.MISTRAL_API_KEY;
    const prevGroqKey = process.env.GROQ_API_KEY;
    const prevGroqModel = process.env.GROQ_MODEL_NAME;
    process.env.LLM_PRIMARY = "groq";
    process.env.MISTRAL_API_KEY = "mistral-secret-key";
    process.env.GROQ_API_KEY = "groq-secret-key";
    process.env.GROQ_MODEL_NAME = "llama-3.3-70b-versatile";
    await withFetch(
      async () => jsonResponse(0),
      async () => {
        resetLlmCircuitBreaker();
        let mistralCalled = false;
        globalThis.fetch = (async (input: unknown) => {
          const url = String(input);
          if (url.includes("mistral")) {
            mistralCalled = true;
            return jsonResponse(200, { choices: [{ message: { content: "m" } }] });
          }
          return jsonResponse(200, { choices: [{ message: { content: "g" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
        assert.equal(mistralCalled, false);
      },
    );
    process.env.LLM_PRIMARY = prevPrimary;
    process.env.MISTRAL_API_KEY = prevMistralKey;
    process.env.GROQ_API_KEY = prevGroqKey;
    process.env.GROQ_MODEL_NAME = prevGroqModel;
  }

  // LLM_PRIMARY=groq: Groq 429 with Mistral configured falls back to Mistral
  {
    const prevPrimary = process.env.LLM_PRIMARY;
    process.env.LLM_PRIMARY = "groq";
    process.env.MISTRAL_API_KEY = "mistral-secret-key";
    process.env.GROQ_API_KEY = "groq-secret-key";
    process.env.GROQ_MODEL_NAME = "llama-3.3-70b-versatile";
    await withFetch(
      async () => jsonResponse(0),
      async () => {
        resetLlmCircuitBreaker();
        globalThis.fetch = (async (input: unknown) => {
          const url = String(input);
          if (url.includes("groq")) return jsonResponse(429, { error: "rate" });
          return jsonResponse(200, { choices: [{ message: { content: "m" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "mistral");
      },
    );
    process.env.LLM_PRIMARY = prevPrimary;
  }

  // Mistral key empty means Mistral is never called
  {
    const prevMistralKey = process.env.MISTRAL_API_KEY;
    const prevGroqKey = process.env.GROQ_API_KEY;
    const prevGroqModel = process.env.GROQ_MODEL_NAME;
    const prevPrimary = process.env.LLM_PRIMARY;
    process.env.LLM_PRIMARY = "mistral";
    process.env.MISTRAL_API_KEY = "";
    process.env.GROQ_API_KEY = "groq-secret-key";
    process.env.GROQ_MODEL_NAME = "llama-3.3-70b-versatile";
    await withFetch(
      async () => jsonResponse(0),
      async () => {
        resetLlmCircuitBreaker();
        let mistralCalled = false;
        globalThis.fetch = (async (input: unknown) => {
          const url = String(input);
          if (url.includes("mistral")) {
            mistralCalled = true;
            return jsonResponse(200, { choices: [{ message: { content: "m" } }] });
          }
          return jsonResponse(200, { choices: [{ message: { content: "g" } }] });
        }) as typeof fetch;
        const { provider } = await callLLM({
          messages: [{ role: "user", content: "hello" }],
          purpose: "chat",
          sleep: async () => {},
        });
        assert.equal(provider, "groq");
        assert.equal(mistralCalled, false);
      },
    );
    process.env.MISTRAL_API_KEY = prevMistralKey;
    process.env.GROQ_API_KEY = prevGroqKey;
    process.env.GROQ_MODEL_NAME = prevGroqModel;
    process.env.LLM_PRIMARY = prevPrimary;
  }

  // Nothing configured gives friendly error without throwing
  {
    const prevMistralKey = process.env.MISTRAL_API_KEY;
    const prevModel = process.env.MODEL_NAME;
    const prevGroqKey = process.env.GROQ_API_KEY;
    const prevGroqModel = process.env.GROQ_MODEL_NAME;
    process.env.MISTRAL_API_KEY = "";
    process.env.MODEL_NAME = "";
    process.env.GROQ_API_KEY = "";
    process.env.GROQ_MODEL_NAME = "";
    await withFetch(
      async () => jsonResponse(0),
      async () => {
        resetLlmCircuitBreaker();
        const cap = captureConsole();
        try {
          const { response } = await callLLM({
            messages: [{ role: "user", content: "hello" }],
            purpose: "chat",
            sleep: async () => {},
          });
          assert.equal(response.status, 400);
          assert.ok(cap.errors.some((l) => l.includes("llm.no_provider_configured")));
        } finally {
          cap.restore();
        }
      },
    );
    process.env.MISTRAL_API_KEY = prevMistralKey;
    process.env.MODEL_NAME = prevModel;
    process.env.GROQ_API_KEY = prevGroqKey;
    process.env.GROQ_MODEL_NAME = prevGroqModel;
  }

  console.log("test:llm-fallback passed");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});