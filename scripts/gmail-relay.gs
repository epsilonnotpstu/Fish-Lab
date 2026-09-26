/**
 * Gmail relay for the lab website.
 * Railway blocks outbound SMTP, so the website sends mail over HTTPS to this
 * script, which sends it from your own Gmail account.
 *
 * Setup: script.google.com → New project → paste this file →
 * Project Settings → Script Properties → MAIL_WEBHOOK_SECRET = <same value as on Railway> → Deploy →
 * New deployment → type "Web app" → Execute as: Me, Who has access: Anyone
 * → Deploy → authorise → copy the Web app URL.
 */
// Secret lives in Script Properties, never in this file:
// Apps Script → Project Settings → Script Properties → add MAIL_WEBHOOK_SECRET
const SECRET = PropertiesService.getScriptProperties().getProperty("MAIL_WEBHOOK_SECRET");
const SENDER_NAME = "AA Lab";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!SECRET || body.secret !== SECRET) return json({ ok: false, error: "unauthorized" });

    const to = String(body.to || "");
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) return json({ ok: false, error: "bad recipient" });

    const options = {
      htmlBody: String(body.html || "").slice(0, 100000),
      name: String(body.name || SENDER_NAME).slice(0, 80),
    };
    if (body.replyTo && /^[^\s@]+@[^\s@]+$/.test(body.replyTo)) options.replyTo = body.replyTo;

    GmailApp.sendEmail(to, String(body.subject || "").slice(0, 200), "This email requires an HTML-capable client.", options);
    return json({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return json({ ok: false, error: String(err).slice(0, 200) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
