import {
  changeEmailConfirmationEmail,
  resetPasswordEmail,
  verificationEmail,
} from "@/lib/email-templates";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; status?: number };

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  /** Action URL (verification/reset/confirmation) for [DEV ONLY] fallback logging. */
  devLink?: string;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function brevoErrorFields(body: unknown): { code?: string; message?: string } {
  if (!body || typeof body !== "object") return {};
  const record = body as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
  };
}

function logDevLink(template: string, devLink: string | undefined): void {
  if (!isDev() || !devLink) return;
  // DEV ONLY: prints the action URL locally so developers can test without a mailbox.
  // Never runs in production. Never logged in the structured production log lines.
  console.info(`[DEV ONLY][${template}] action link: ${devLink}`);
}

async function attemptSend(
  input: Required<Pick<SendEmailOptions, "to" | "subject" | "html" | "text">> & {
    apiKey: string;
    senderEmail: string;
    senderName: string;
  },
): Promise<{ status?: number; ok: true; messageId: string } | { status?: number; ok: false; error: string; code?: string; message?: string; retryable: boolean }> {
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": input.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: input.senderName, email: input.senderEmail },
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const status = response.status;
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (response.ok && status === 201) {
      const messageId =
        body && typeof body === "object" && typeof (body as { messageId?: unknown }).messageId === "string"
          ? (body as { messageId: string }).messageId
          : "unknown";
      return { ok: true, status, messageId };
    }

    const { code, message } = brevoErrorFields(body);
    const retryable = status === 429 || status >= 500;
    return {
      ok: false,
      status,
      retryable,
      code,
      message,
      error: message || `Brevo request failed with status ${status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    return { ok: false, retryable: true, error: message, message };
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  console.log("[DEBUG:auth-email] stage:sendEmail_entered");
  const start = Date.now();
  const toMasked = maskEmail(options.to);
  const template = options.template;

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Nexa AI";

  const missing: string[] = [];
  if (!apiKey) missing.push("BREVO_API_KEY");
  if (!senderEmail) missing.push("BREVO_SENDER_EMAIL");

  if (missing.length > 0 || !apiKey || !senderEmail) {
    console.log("[DEBUG:auth-email] stage:sendEmail_not_configured");
    console.error(
      JSON.stringify({
        event: "email.not_configured",
        template,
        to: toMasked,
        missing,
        durationMs: Date.now() - start,
      }),
    );
    logDevLink(template, options.devLink);
    return { ok: false, error: `Email not configured: missing ${missing.join(", ")}` };
  }

  console.log("[DEBUG:auth-email] stage:sendEmail_before_fetch");
  const payload = {
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    apiKey,
    senderEmail,
    senderName,
  };

  let result = await attemptSend(payload);
  if (!result.ok && result.retryable) {
    await sleep(500);
    result = await attemptSend(payload);
  }

  const durationMs = Date.now() - start;

  if (result.ok) {
    console.log("[DEBUG:auth-email] stage:sendEmail_ok");
    console.info(
      JSON.stringify({
        event: "email.sent",
        template,
        to: toMasked,
        messageId: result.messageId,
        durationMs,
      }),
    );
    return { ok: true, messageId: result.messageId };
  }

  console.log("[DEBUG:auth-email] stage:sendEmail_failed");
  console.error(
    JSON.stringify({
      event: "email.failed",
      template,
      to: toMasked,
      status: result.status,
      code: result.code,
      message: result.message,
      durationMs,
    }),
  );
  logDevLink(template, options.devLink);
  return { ok: false, error: result.error, status: result.status };
}

export async function sendPasswordResetEmail({
  to,
  name,
  url,
}: {
  to: string;
  name?: string | null;
  url: string;
}): Promise<void> {
  const template = resetPasswordEmail({ name, url });
  await sendEmail({
    to,
    ...template,
    template: "password_reset",
    devLink: url,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  url,
}: {
  to: string;
  name?: string | null;
  url: string;
}): Promise<void> {
  console.log("[DEBUG:auth-email] stage:email_wrapper_entered");
  const template = verificationEmail({ name, url });
  await sendEmail({
    to,
    ...template,
    template: "email_verification",
    devLink: url,
  });
  console.log("[DEBUG:auth-email] stage:email_wrapper_done");
}

export async function sendChangeEmailConfirmation({
  to,
  name,
  newEmail,
  url,
}: {
  to: string;
  name?: string | null;
  newEmail: string;
  url: string;
}): Promise<void> {
  const template = changeEmailConfirmationEmail({ name, newEmail, url });
  await sendEmail({
    to,
    ...template,
    template: "change_email_confirmation",
    devLink: url,
  });
}
