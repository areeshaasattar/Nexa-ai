export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeName(name: string | undefined | null): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.length > 0 ? trimmed : "there";
}

function layout({
  title,
  body,
  buttonLabel,
  url,
  footer,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  url: string;
  footer: string;
}): string {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#166534;padding:20px 24px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">Nexa AI</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;color:#1f2937;font-size:15px;line-height:1.6;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">${title}</h1>
                ${body}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
                  <tr>
                    <td align="center" style="border-radius:10px;background-color:#166534;">
                      <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${buttonLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;color:#4b5563;font-size:13px;line-height:1.5;">Or paste this link into your browser:</p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" style="color:#166534;text-decoration:underline;">${safeUrl}</a></p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function verificationEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}): EmailTemplate {
  const who = escapeHtml(safeName(name));
  const subject = "Verify your Nexa AI email";
  const html = layout({
    title: "Verify your email address",
    body: `<p style="margin:0 0 12px;">Hi ${who},</p>
                <p style="margin:0 0 12px;">Thanks for creating a Nexa AI account. Confirm your email address to finish setting up your account.</p>
                <p style="margin:0;">This link is valid for <strong>1 hour</strong>.</p>`,
    buttonLabel: "Verify email",
    url,
    footer: "If you did not request this, you can ignore this email.",
  });
  const text = [
    "Verify your Nexa AI email",
    "",
    `Hi ${safeName(name)},`,
    "",
    "Thanks for creating a Nexa AI account. Confirm your email address to finish setting up your account.",
    "This link is valid for 1 hour.",
    "",
    url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  return { subject, html, text };
}

export function resetPasswordEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}): EmailTemplate {
  const who = escapeHtml(safeName(name));
  const subject = "Reset your Nexa AI password";
  const html = layout({
    title: "Reset your password",
    body: `<p style="margin:0 0 12px;">Hi ${who},</p>
                <p style="margin:0 0 12px;">We received a request to reset the password for your Nexa AI account.</p>
                <p style="margin:0;">This link is valid for <strong>1 hour</strong>.</p>`,
    buttonLabel: "Reset password",
    url,
    footer: "If you did not request this, you can ignore this email.",
  });
  const text = [
    "Reset your Nexa AI password",
    "",
    `Hi ${safeName(name)},`,
    "",
    "We received a request to reset the password for your Nexa AI account.",
    "This link is valid for 1 hour.",
    "",
    url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  return { subject, html, text };
}

export function changeEmailConfirmationEmail({
  name,
  newEmail,
  url,
}: {
  name?: string | null;
  newEmail: string;
  url: string;
}): EmailTemplate {
  const who = escapeHtml(safeName(name));
  const safeNewEmail = escapeHtml(newEmail);
  const subject = "Confirm your new Nexa AI email";
  const html = layout({
    title: "Confirm your new email address",
    body: `<p style="margin:0 0 12px;">Hi ${who},</p>
                <p style="margin:0 0 12px;">You asked to change the email address on your Nexa AI account to <strong>${safeNewEmail}</strong>. Confirm this change to finish updating your account.</p>
                <p style="margin:0;">This link is valid for <strong>1 hour</strong>.</p>`,
    buttonLabel: "Confirm new email",
    url,
    footer: "If you did not request this, you can ignore this email.",
  });
  const text = [
    "Confirm your new Nexa AI email",
    "",
    `Hi ${safeName(name)},`,
    "",
    `You asked to change the email address on your Nexa AI account to ${newEmail}. Confirm this change to finish updating your account.`,
    "This link is valid for 1 hour.",
    "",
    url,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  return { subject, html, text };
}
