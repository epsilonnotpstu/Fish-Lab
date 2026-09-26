import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { GOOGLE_COOKIE, googleConfigured, redirectUri } from "@/lib/google-oauth";

/** Start "Continue with Google": redirect to Google with state, nonce and PKCE. */
export async function GET() {
  const site = process.env.SITE_URL ?? "";
  if (!googleConfigured()) return NextResponse.redirect(new URL("/account/login?error=google_off", site || "http://localhost:3000"));

  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_COOKIE, JSON.stringify({ state, nonce, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
