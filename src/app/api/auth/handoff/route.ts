import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession, isStaff } from "@/lib/auth";
import { consumeHandoffToken } from "@/lib/app-handoff";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";

/** The Android app exchanges its one-time token for a session in its web view. */
export async function GET(request: NextRequest) {
  const site = process.env.SITE_URL || new URL(request.url).origin;
  const fail = (error: string) => NextResponse.redirect(new URL(`/account/login?error=${error}`, site));

  if (!(await rateLimit(`handoff:${await clientIpHash()}`, 30, 15 * 60 * 1000))) return fail("rate");

  const userId = await consumeHandoffToken(request.nextUrl.searchParams.get("t") ?? "");
  if (!userId) return fail("google_expired");

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, active: true, role: true } });
  if (!user?.active) return fail("disabled");
  if (isStaff(user.role)) return fail("staff");

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  return NextResponse.redirect(new URL("/account", site));
}
