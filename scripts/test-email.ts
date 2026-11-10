import assert from "node:assert/strict";
import {
  changeEmailConfirmationEmail,
  resetPasswordEmail,
  verificationEmail,
} from "../src/lib/email-templates";
import { maskEmail, sendEmail } from "../src/lib/email";

type FetchCall = { input: unknown; init?: RequestInit };
type FetchStub = (input: unknown, init?: RequestInit) => Promise<Response>;

async function withEnv<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function withFetch<T>(stub: FetchStub, fn: () => Promise<T>): Promise<T> {
  const prev = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = prev;
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function main() {
  // maskEmail
  const masked = maskEmail("areesha@gmail.com");
  assert.ok(!masked.includes("areesha"), "masked email must not contain full local part");
  assert.ok(masked.includes("@gmail.com"), "masked email keeps domain");
  assert.match(masked, /^a\*\*\*@/);

  // templates
  const templates = [
    ["verification", verificationEmail({ name: "Ada", url: "https://app.example/verify?t=1" })],
    ["reset", resetPasswordEmail({ name: "Ada", url: "https://app.example/reset?t=2" })],
    [
      "change",
      changeEmailConfirmationEmail({
        name: "Ada",
        newEmail: "new@example.com",
        url: "https://app.example/confirm?t=3",
      }),
    ],
  ] as const;

  for (const [label, tpl] of templates) {
    assert.ok(tpl.subject.trim().length > 0, `${label} subject`);
    assert.ok(tpl.html.trim().length > 0, `${label} html`);
    assert.ok(tpl.text.trim().length > 0, `${label} text`);
  }

  for (const tpl of [templates[0][1], templates[1][1]]) {
    assert.ok(tpl.html.includes("https://app.example/"), "URL appears in html");
    assert.ok(tpl.text.includes("https://app.example/"), "URL appears in text");
  }
  assert.ok(templates[2][1].html.includes("https://app.example/confirm?t=3"));
  assert.ok(templates[2][1].text.includes("https://app.example/confirm?t=3"));

  const xss = verificationEmail({
    name: "<script>alert(1)</script>",
    url: "https://app.example/verify?t=1",
  });
  assert.ok(!xss.html.includes("<script>alert(1)</script>"), "malicious name must be escaped");
  assert.ok(xss.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));

  // missing env vars -> ok:false, never throws
  await withEnv(
    { BREVO_API_KEY: undefined, BREVO_SENDER_EMAIL: undefined, BREVO_SENDER_NAME: undefined, NODE_ENV: "test" },
    async () => {
      const result = await sendEmail({
        to: "user@example.com",
        subject: "s",
        html: "<p>h</p>",
        text: "h",
        template: "test",
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.error, /not configured/i);
    },
  );

  const configured = {
    BREVO_API_KEY: "test-key",
    BREVO_SENDER_EMAIL: "sender@example.com",
    BREVO_SENDER_NAME: "Nexa AI",
    NODE_ENV: "test",
  };

  // 201 -> ok:true, messageId
  await withEnv(configured, async () => {
    const calls: FetchCall[] = [];
    const result = await withFetch(
      async (input, init) => {
        calls.push({ input, init });
        return jsonResponse(201, { messageId: "abc" });
      },
      () =>
        sendEmail({
          to: "user@example.com",
          subject: "s",
          html: "<p>h</p>",
          text: "h",
          template: "test",
        }),
    );
    assert.equal(calls.length, 1);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.messageId, "abc");
  });

  // 400 -> ok:false, status 400, NO retry
  await withEnv(configured, async () => {
    const calls: FetchCall[] = [];
    const result = await withFetch(
      async (input, init) => {
        calls.push({ input, init });
        return jsonResponse(400, { code: "bad_request", message: "bad" });
      },
      () =>
        sendEmail({
          to: "user@example.com",
          subject: "s",
          html: "<p>h</p>",
          text: "h",
          template: "test",
        }),
    );
    assert.equal(calls.length, 1);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
  });

  // 500 then 201 -> 2 calls, ok:true
  await withEnv(configured, async () => {
    let calls = 0;
    const result = await withFetch(
      async () => {
        calls += 1;
        if (calls === 1) return jsonResponse(500, { code: "server_error", message: "oops" });
        return jsonResponse(201, { messageId: "abc" });
      },
      () =>
        sendEmail({
          to: "user@example.com",
          subject: "s",
          html: "<p>h</p>",
          text: "h",
          template: "test",
        }),
    );
    assert.equal(calls, 2);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.messageId, "abc");
  });

  console.log("test:email passed (maskEmail, templates, escaping, missing env, 201, 400 no-retry, 500->201 retry)");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
