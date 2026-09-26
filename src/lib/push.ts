import "server-only";
import { createSign } from "node:crypto";
import { db } from "./db";

/**
 * Firebase Cloud Messaging over the HTTP v1 API.
 *
 * Configure with a service-account JSON (Firebase console → Project settings →
 * Service accounts → Generate new private key) in FIREBASE_SERVICE_ACCOUNT,
 * either as raw JSON or base64. Everything here is a no-op until it is set, so
 * the site keeps working without Firebase.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    cachedAccount = null;
    return null;
  }
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as ServiceAccount;
    cachedAccount = parsed.project_id && parsed.client_email && parsed.private_key ? parsed : null;
  } catch (err) {
    console.error("FIREBASE_SERVICE_ACCOUNT could not be parsed", err);
    cachedAccount = null;
  }
  return cachedAccount;
}

export function pushConfigured() {
  return serviceAccount() !== null;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

/** Google OAuth token for the FCM scope, signed with the service-account key. */
async function accessToken(account: ServiceAccount) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(account.private_key.replace(/\\n/g, "\n"), "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? "FCM auth failed");
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Where tapping the notification should open. */
  link?: string;
  tag?: string;
};

async function sendToToken(account: ServiceAccount, token: string, auth: string, payload: PushPayload) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        data: { link: payload.link ?? "/account", tag: payload.tag ?? "lab" },
        android: { priority: "HIGH", notification: { sound: "default", tag: payload.tag ?? "lab" } },
        webpush: {
          notification: { title: payload.title, body: payload.body, tag: payload.tag ?? "lab" },
          fcm_options: { link: `${process.env.SITE_URL ?? ""}${payload.link ?? "/account"}` },
        },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return { ok: true as const };
  const text = await res.text().catch(() => "");
  // 404/403 means the token is dead (app uninstalled, permission revoked).
  const stale = res.status === 404 || text.includes("UNREGISTERED") || text.includes("INVALID_ARGUMENT");
  if (!stale) console.error("FCM send failed", res.status, text.slice(0, 200));
  return { ok: false as const, stale };
}

/** Send a notification to specific users. Never throws. */
export async function pushToUsers(userIds: string[], payload: PushPayload) {
  const account = serviceAccount();
  if (!account || userIds.length === 0) return { sent: 0 };
  try {
    const tokens = await db.pushToken.findMany({
      where: { userId: { in: [...new Set(userIds)] } },
      select: { id: true, token: true },
    });
    if (!tokens.length) return { sent: 0 };

    const auth = await accessToken(account);
    const stale: string[] = [];
    let sent = 0;
    await Promise.all(
      tokens.map(async (t) => {
        const res = await sendToToken(account, t.token, auth, payload);
        if (res.ok) sent += 1;
        else if (res.stale) stale.push(t.id);
      }),
    );
    if (stale.length) await db.pushToken.deleteMany({ where: { id: { in: stale } } });
    return { sent };
  } catch (err) {
    console.error("push failed", err instanceof Error ? err.message : err);
    return { sent: 0 };
  }
}

/** Everyone who may receive lab notifications, optionally excluding one user. */
export async function notifiableUserIds(opts: { kind: "chat" | "notice"; exclude?: string }) {
  const users = await db.user.findMany({
    where: {
      active: true,
      ...(opts.kind === "chat" ? { notifyChat: true } : { notifyNotices: true }),
      OR: [{ role: { in: ["SUPER_ADMIN", "EDITOR"] } }, { member: { status: "APPROVED" } }],
      ...(opts.exclude ? { NOT: { id: opts.exclude } } : {}),
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
