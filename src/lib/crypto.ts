import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return s;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Keyed hash so stored IPs cannot be reversed by brute-forcing the IPv4 space. */
export function hashIp(ip: string) {
  return createHmac("sha256", secret()).update(ip).digest("hex").slice(0, 32);
}
