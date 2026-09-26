import "server-only";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.SITE_URL);
}

export const GOOGLE_COOKIE = "lab_goauth";

export function redirectUri() {
  return `${process.env.SITE_URL!.replace(/\/$/, "")}/api/auth/google/callback`;
}

export type GoogleProfile = { email: string; name: string; picture?: string };

/**
 * Exchange the authorisation code (with PKCE) and validate the ID token claims.
 * The token comes straight from Google's token endpoint over TLS, so its
 * signature does not need separate verification (OIDC Core §3.1.3.7).
 */
export async function exchangeCode(code: string, verifier: string, nonce: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as { id_token?: string; error?: string };
  if (!res.ok || !data.id_token) throw new Error(`token exchange failed: ${data.error ?? res.status}`);

  const payload = JSON.parse(Buffer.from(data.id_token.split(".")[1], "base64url").toString("utf8")) as {
    iss: string; aud: string; exp: number; nonce?: string; email?: string; email_verified?: boolean; name?: string; picture?: string;
  };
  if (!["https://accounts.google.com", "accounts.google.com"].includes(payload.iss)) throw new Error("bad issuer");
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("bad audience");
  if (payload.exp * 1000 < Date.now()) throw new Error("expired token");
  if (payload.nonce !== nonce) throw new Error("bad nonce");
  if (!payload.email || !payload.email_verified) throw new Error("email not verified");

  return { email: payload.email.toLowerCase(), name: payload.name ?? payload.email.split("@")[0], picture: payload.picture };
}
