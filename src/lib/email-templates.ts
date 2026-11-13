export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 1) return value.slice(0, max);
  return `${value.slice(0, max - 1)}…`;
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

function capItems<T>(items: T[], limit = 8): T[] {
  return items.slice(0, limit);
}

function capText(value: string, max = 300): string {
  return truncate(value, max);
}

export function summaryEmail({
  name,
  meetingName,
  durationText,
  overview,
  decisions,
  actionItems,
  topics,
  openQuestions,
  meetingUrl,
  settingsUrl,
}: {
  name?: string | null;
  meetingName: string;
  durationText?: string | null;
  overview: string;
  decisions: string[];
  actionItems: Array<{ task: string; owner: string | null; dueDate: string | null }>;
  topics: string[];
  openQuestions: string[];
  meetingUrl: string;
  settingsUrl: string;
}): EmailTemplate {
  const subject = `Summary: ${truncate(meetingName, 80)}`;
  const who = escapeHtml(safeName(name));
  const safeMeetingName = escapeHtml(truncate(meetingName, 80));
  const safeOverview = escapeHtml(truncate(overview, 1200));
  const safeDuration = durationText ? escapeHtml(truncate(durationText, 80)) : null;

  const sectionsHtml: string[] = [];
  const sectionsText: string[] = [];

  sectionsHtml.push(
    `<p style="margin:0 0 12px;">Hi ${who},</p>` +
      `<p style="margin:0 0 12px;">Your meeting summary for <strong>${safeMeetingName}</strong>${safeDuration ? ` (${safeDuration})` : ""} is ready.</p>`,
  );
  sectionsText.push(`Hi ${safeName(name)},`, "", `Your meeting summary for "${truncate(meetingName, 80)}"${durationText ? ` (${durationText})` : ""} is ready.`);

  if (overview.trim()) {
    sectionsHtml.push(
      `<h2 style="margin:20px 0 8px;font-size:16px;line-height:1.4;color:#111827;">Overview</h2>` +
        `<p style="margin:0 0 12px;color:#374151;">${safeOverview}</p>`,
    );
    sectionsText.push("", "Overview", truncate(overview, 1200));
  }

  if (decisions.length > 0) {
    const items = capItems(decisions).map((d) => capText(d, 300));
    sectionsHtml.push(
      `<h2 style="margin:20px 0 8px;font-size:16px;line-height:1.4;color:#111827;">Decisions</h2>` +
        `<ul style="margin:0 0 12px;padding-left:20px;color:#374151;">${items
          .map((d) => `<li style="margin:0 0 6px;">${escapeHtml(d)}</li>`)
          .join("")}</ul>`,
    );
    sectionsText.push("", "Decisions", ...items.map((d) => `- ${d}`));
  }

  if (actionItems.length > 0) {
    const items = capItems(actionItems).map((item) => ({
      task: capText(item.task, 300),
      owner: item.owner ? capText(item.owner, 100) : null,
      dueDate: item.dueDate ? capText(item.dueDate, 100) : null,
    }));
    sectionsHtml.push(
      `<h2 style="margin:20px 0 8px;font-size:16px;line-height:1.4;color:#111827;">Action items</h2>` +
        `<ul style="margin:0 0 12px;padding-left:20px;color:#374151;">${items
          .map((item) => {
            const meta: string[] = [];
            if (item.owner) meta.push(`Owner: ${escapeHtml(item.owner)}`);
            if (item.dueDate) meta.push(`Due: ${escapeHtml(item.dueDate)}`);
            const suffix = meta.length > 0 ? ` <span style="color:#6b7280;">(${meta.join(", ")})</span>` : "";
            return `<li style="margin:0 0 6px;">${escapeHtml(item.task)}${suffix}</li>`;
          })
          .join("")}</ul>`,
    );
    sectionsText.push(
      "",
      "Action items",
      ...items.map((item) => {
        const meta: string[] = [];
        if (item.owner) meta.push(`Owner: ${item.owner}`);
        if (item.dueDate) meta.push(`Due: ${item.dueDate}`);
        return `- ${item.task}${meta.length > 0 ? ` (${meta.join(", ")})` : ""}`;
      }),
    );
  }

  if (topics.length > 0) {
    const items = capItems(topics).map((t) => capText(t, 300));
    sectionsHtml.push(
      `<h2 style="margin:20px 0 8px;font-size:16px;line-height:1.4;color:#111827;">Topics</h2>` +
        `<ul style="margin:0 0 12px;padding-left:20px;color:#374151;">${items
          .map((t) => `<li style="margin:0 0 6px;">${escapeHtml(t)}</li>`)
          .join("")}</ul>`,
    );
    sectionsText.push("", "Topics", ...items.map((t) => `- ${t}`));
  }

  if (openQuestions.length > 0) {
    const items = capItems(openQuestions).map((q) => capText(q, 300));
    sectionsHtml.push(
      `<h2 style="margin:20px 0 8px;font-size:16px;line-height:1.4;color:#111827;">Open questions</h2>` +
        `<ul style="margin:0 0 12px;padding-left:20px;color:#374151;">${items
          .map((q) => `<li style="margin:0 0 6px;">${escapeHtml(q)}</li>`)
          .join("")}</ul>`,
    );
    sectionsText.push("", "Open questions", ...items.map((q) => `- ${q}`));
  }

  const footer = `You are receiving this because summary emails are on for your account. Turn them off in Settings: <a href="${escapeHtml(settingsUrl)}" style="color:#166534;text-decoration:underline;">${escapeHtml(settingsUrl)}</a>`;

  const html = layout({
    title: "Meeting summary ready",
    body: sectionsHtml.join(""),
    buttonLabel: "View full meeting",
    url: meetingUrl,
    footer,
  });

  const text = [
    subject,
    ...sectionsText,
    "",
    `View full meeting: ${meetingUrl}`,
    "",
    `You are receiving this because summary emails are on for your account. Turn them off in Settings: ${settingsUrl}`,
  ].join("\n");

  return { subject, html, text };
}
