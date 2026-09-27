import { NextResponse } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";

/**
 * Entry point for the Android app: send each person where they belong, so one
 * sign-in screen serves both members and administrators.
 */
export async function GET(request: Request) {
  const site = process.env.SITE_URL || new URL(request.url).origin;
  const user = await getCurrentUser();
  const target = !user ? "/account/login" : isStaff(user.role) ? "/admin" : "/account";
  return NextResponse.redirect(new URL(target, site), { headers: { "Cache-Control": "no-store" } });
}
