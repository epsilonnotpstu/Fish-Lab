import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { audit, createSession, isStaff } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { exchangeCode, GOOGLE_COOKIE, googleConfigured } from "@/lib/google-oauth";

function back(error: string) {
  const res = NextResponse.redirect(new URL(`/account/login?error=${error}`, process.env.SITE_URL));
  res.cookies.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });
  return res;
}

function sameString(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: NextRequest) {
  if (!googleConfigured()) return back("google_off");
  if (!(await rateLimit(`google:${await clientIpHash()}`, 20, 15 * 60 * 1000))) return back("rate");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return back("google_cancelled");
  const code = params.get("code") ?? "";
  const state = params.get("state") ?? "";

  let saved: { state: string; nonce: string; verifier: string };
  try {
    saved = JSON.parse(request.cookies.get(GOOGLE_COOKIE)?.value ?? "");
  } catch {
    return back("google_expired");
  }
  if (!code || !state || !saved?.state || !sameString(state, saved.state)) return back("google_state");

  let profile;
  try {
    profile = await exchangeCode(code, saved.verifier, saved.nonce);
  } catch (err) {
    console.error("Google sign-in failed:", err instanceof Error ? err.message : err);
    return back("google_failed");
  }

  let user = await db.user.findUnique({ where: { email: profile.email } });
  if (user && (!user.active || isStaff(user.role))) {
    // Staff accounts sign in with password (+ optional 2-step) at /admin/login.
    return back(user.active ? "staff" : "disabled");
  }
  if (!user) {
    const memberProfile = await db.member.findFirst({
      where: { email: { equals: profile.email, mode: "insensitive" }, account: null },
    });
    user = await db.user.create({
      data: { email: profile.email, name: profile.name.slice(0, 120), role: "MEMBER", memberId: memberProfile?.id },
    });
    await audit(user.id, "sign up (Google)", "Member account", user.id, profile.email);
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  const res = NextResponse.redirect(new URL("/account", process.env.SITE_URL));
  res.cookies.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });
  return res;
}
