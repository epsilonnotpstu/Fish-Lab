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

export async function userAgent() {
  return ((await headers()).get("user-agent") ?? "").slice(0, 255);
}
