import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { ContactMessage } from "@prisma/client";
import type { Settings } from "./settings";
import { safeHex } from "./theme";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Accept either name; Google shows app passwords with spaces, which must be removed.
const smtpPass = () => (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass());
}

function webhookConfigured() {
  return Boolean(process.env.MAIL_WEBHOOK_URL && process.env.MAIL_WEBHOOK_SECRET);
}

export function mailConfigured() {
  return webhookConfigured() || smtpConfigured() || Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

/** Display name from MAIL_FROM ("Lab Name <x@y>" → "Lab Name"). */
function senderName() {
  return (process.env.MAIL_FROM ?? "").match(/^\s*"?([^"<]+?)"?\s*</)?.[1] ?? "";
}

/** Gmail relay over HTTPS (scripts/gmail-relay.gs), for hosts that block SMTP. */
async function sendViaWebhook(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const res = await fetch(process.env.MAIL_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.MAIL_WEBHOOK_SECRET, name: senderName() || undefined, ...opts }),
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !data?.ok) {
    console.error("Mail relay failed", res.status, data?.error ?? "no JSON response");
    throw new Error("Could not send email.");
  }
}

let transport: Transporter | null = null;
function smtp() {
  const port = Number(process.env.SMTP_PORT || 465);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: smtpPass() },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

/**
 * Send an email through SMTP (e.g. Gmail with an App Password) when SMTP_* is
 * set, otherwise through Resend. Throws if the provider rejects the message.
 */
export async function sendMail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const subject = opts.subject.slice(0, 200);

  if (webhookConfigured()) {
    await sendViaWebhook({ ...opts, subject });
    return;
  }

  if (smtpConfigured()) {
    try {
      await smtp().sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: opts.to,
        subject,
        html: opts.html,
        replyTo: opts.replyTo,
      });
    } catch (err) {
      const e = err as { code?: string; command?: string; message?: string };
      console.error("SMTP send failed", e.code, e.command, e.message?.slice(0, 200));
      throw new Error("Could not send email.");
    }
    return;
  }

  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      // Development fallback so flows can be tested without an email provider.
      console.info(`\n[mail:dev] To: ${opts.to}\n[mail:dev] Subject: ${subject}\n`);
      return;
    }
    throw new Error("Email is not configured (SMTP_* or RESEND_API_KEY / MAIL_FROM).");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [opts.to],
      subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Resend error", res.status, body.slice(0, 300));
    throw new Error("Could not send email.");
  }
}

function layout(settings: Settings, inner: string) {
  const brand = safeHex(settings.primaryColor, "#0b3b5c");
  const accent = safeHex(settings.accentColor, "#14b8a6");
  return `<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <tr><td style="background:${brand};padding:24px 32px;color:#fff">
      <div style="font-size:18px;font-weight:700">${escapeHtml(settings.shortName || settings.labName)}</div>
      <div style="font-size:12px;opacity:.7">${escapeHtml(settings.labName)}</div>
    </td></tr>
    <tr><td style="padding:32px">${inner}</td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">
      ${escapeHtml([settings.faculty, settings.university].filter(Boolean).join(" · "))}
    </td></tr>
  </table></td></tr></table>
  <span style="display:none;color:${accent}"></span></body></html>`;
}

export function otpEmail(settings: Settings, code: string, purpose: string) {
  const intro =
    purpose === "signup"
      ? "Welcome! Use this code to finish creating your member account."
      : purpose === "admin-2fa"
        ? "Use this code to complete your sign-in to the admin panel."
        : "Use this code to sign in to your member account.";
  const accent = safeHex(settings.accentColor, "#14b8a6");
  return layout(
    settings,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6">${intro}</p>
     <div style="font-size:34px;font-weight:800;letter-spacing:10px;text-align:center;background:#f1f5f9;border-radius:12px;padding:18px 0;border-bottom:3px solid ${accent}">${code}</div>
     <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.6">The code expires in 10 minutes. If you did not request it, you can safely ignore this email — nobody can sign in without the code.</p>`,
  );
}

/** Notify the lab inbox about a new contact-form message (best effort). */
export async function notifyNewMessage(settings: Settings, msg: ContactMessage) {
  const to = process.env.MAIL_TO || settings.email;
  if (!mailConfigured() || !to) return;
  await sendMail({
    to,
    replyTo: msg.email,
    subject: `[${settings.shortName}] ${msg.subject || "New website inquiry"}`,
    html: layout(
      settings,
      `<h2 style="margin:0 0 16px;font-size:18px">New message from the website</h2>
       <p style="font-size:14px;line-height:1.7"><strong>Name:</strong> ${escapeHtml(msg.name)}<br/>
       <strong>Email:</strong> ${escapeHtml(msg.email)}<br/>
       <strong>Type:</strong> ${escapeHtml(msg.type || "-")}<br/>
       <strong>Subject:</strong> ${escapeHtml(msg.subject || "-")}</p>
       <p style="white-space:pre-wrap;font-size:14px;line-height:1.7;background:#f8fafc;border-radius:10px;padding:16px">${escapeHtml(msg.message)}</p>`,
    ),
  });
}
