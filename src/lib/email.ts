import { Resend } from "resend";

/**
 * Lightweight email layer built on Resend.
 *
 * - If `RESEND_API_KEY` is missing we log a clear warning and skip sending
 *   (never throw) so local dev / builds don't crash.
 * - The sender address comes from `RESEND_FROM_EMAIL`. When unset it falls
 *   back to Resend's shared sandbox sender `onboarding@resend.dev`, which only
 *   delivers to your own verified account email. Set a verified custom domain
 *   before going to production (see FEATURES.md / env docs).
 */

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "Nexa AI <onboarding@resend.dev>";

// Lazily create the client once. Guarded against double-init by module caching.
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn(
    "[email] RESEND_API_KEY is not set. Password reset emails will NOT be sent. " +
      "Add RESEND_API_KEY (and optionally RESEND_FROM_EMAIL) to your environment to enable email delivery.",
  );
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** HTML body. Required so Resend's type union resolves to the HTML template variant. */
  html: string;
  /** Plain-text body (optional — fallback for email clients without HTML). */
  text?: string;
}

/**
 * Send a transactional email through Resend.
 * Returns without throwing when the client is unavailable.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<void> {
  if (!resend) {
    console.warn(`[email] Skipping email to "${to}" — RESEND_API_KEY is missing.`);
    return;
  }

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

/**
 * Send the Better-Auth password reset email.
 *
 * `url` is the full reset link (with the single-use token embedded) that
 * Better-Auth validates before the user reaches the reset form.
 */
export async function sendPasswordResetEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your Nexa AI password",
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a2e1a;">
        <h2 style="margin: 0 0 16px; color: #1a2e1a;">Reset your password</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #3f5a3f;">
          We received a request to reset the password for your Nexa AI account.
          Click the button below to choose a new one. This link is valid for
          <strong>1 hour</strong>.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${url}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #6b826b;">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${url}" style="color: #166534; word-break: break-all;">${url}</a>
        </p>
        <p style="font-size: 13px; color: #6b826b; margin-top: 32px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `
Reset your Nexa AI password

We received a request to reset the password for your Nexa AI account. Use the
link below to choose a new one. It is valid for 1 hour.

${url}

If you didn't request this, you can safely ignore this email.
    `.trim(),
  });
}

/**
 * Send the Better-Auth email-verification email.
 *
 * `url` is the full verification link (with the single-use token embedded) that
 * Better-Auth validates before it flips `emailVerified` to true and — because
 * `autoSignInAfterVerification` is set — signs the user in automatically.
 */
export async function sendVerificationEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your Nexa AI email",
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a2e1a;">
        <h2 style="margin: 0 0 16px; color: #1a2e1a;">Verify your email address</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #3f5a3f;">
          Thanks for creating a Nexa AI account. To finish setting it up and
          start using the platform, please confirm your email address by
          clicking the button below. This link is valid for
          <strong>1 hour</strong>.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${url}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
            Verify email
          </a>
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #6b826b;">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${url}" style="color: #166534; word-break: break-all;">${url}</a>
        </p>
        <p style="font-size: 13px; color: #6b826b; margin-top: 32px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `
Verify your Nexa AI email

Thanks for creating a Nexa AI account. Confirm your email address by opening
the link below. It is valid for 1 hour.

${url}

If you didn't create an account, you can safely ignore this email.
    `.trim(),
  });
}
