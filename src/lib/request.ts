import "server-only";
import { headers } from "next/headers";
import { hashIp } from "./crypto";

/** Client IP as seen by the platform proxy (Railway/Vercel set x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function clientIpHash() {
  return hashIp(await clientIp());
}

/**
 * Our Android shell adds AALabApp to the user agent. Google blocks OAuth in
 * embedded web views, so the app uses password / e-mail-code sign-in instead.
 */
export async function isLabApp() {
  return (await userAgent()).includes("AALabApp");
}

export async function userAgent() {
  return ((await headers()).get("user-agent") ?? "").slice(0, 255);
}
