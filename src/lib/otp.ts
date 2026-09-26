import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { getSettings } from "./settings";
import { sendMail, mailConfigured, otpEmail } from "./mail";

export const OTP_COOKIE = "lab_otp";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "signup" | "login" | "admin-2fa";

function hashCode(challengeId: string, code: string) {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(`${challengeId}:${code}`).digest("hex");
}

/** Create a challenge, e-mail the 6-digit code and remember the challenge in a short-lived cookie. */
export async function startChallenge(opts: { email: string; purpose: OtpPurpose; name?: string; userId?: string }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Invalidate earlier open challenges for the same email + purpose.
  await db.otpChallenge.updateMany({
    where: { email: opts.email, purpose: opts.purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const challenge = await db.otpChallenge.create({
    data: {
      email: opts.email,
      purpose: opts.purpose,
      name: opts.name ?? "",
      userId: opts.userId,
      codeHash: "pending",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  await db.otpChallenge.update({ where: { id: challenge.id }, data: { codeHash: hashCode(challenge.id, code) } });

  const settings = await getSettings();
  await sendMail({
    to: opts.email,
    subject: `${code} is your ${settings.shortName || settings.labName} verification code`,
    html: otpEmail(settings, code, opts.purpose),
  });

  (await cookies()).set(OTP_COOKIE, challenge.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OTP_TTL_MS / 1000,
  });
  return challenge.id;
}

export async function currentChallenge(purpose: OtpPurpose | OtpPurpose[]) {
  const id = (await cookies()).get(OTP_COOKIE)?.value;
  if (!id || id.length > 40) return null;
  const c = await db.otpChallenge.findUnique({ where: { id } });
  const purposes = Array.isArray(purpose) ? purpose : [purpose];
  if (!c || c.consumedAt || c.expiresAt < new Date() || !purposes.includes(c.purpose as OtpPurpose)) return null;
  return c;
}

export type VerifyResult =
  | { ok: true; challenge: NonNullable<Awaited<ReturnType<typeof currentChallenge>>> }
  | { ok: false; error: string };

export async function verifyChallenge(purpose: OtpPurpose | OtpPurpose[], code: string): Promise<VerifyResult> {
  const c = await currentChallenge(purpose);
  if (!c) return { ok: false, error: "This code has expired. Please request a new one." };
  if (c.attempts >= MAX_ATTEMPTS) {
    await db.otpChallenge.update({ where: { id: c.id }, data: { consumedAt: new Date() } });
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }
  const clean = code.replace(/\D/g, "");
  const expected = Buffer.from(c.codeHash, "hex");
  const actual = Buffer.from(hashCode(c.id, clean), "hex");
  const match = clean.length === 6 && expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) {
    await db.otpChallenge.update({ where: { id: c.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - c.attempts - 1;
    return { ok: false, error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Please request a new code." };
  }
  // Single use.
  const consumed = await db.otpChallenge.updateMany({ where: { id: c.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) return { ok: false, error: "This code has already been used." };
  (await cookies()).delete(OTP_COOKIE);
  return { ok: true, challenge: c };
}

export async function clearChallenge() {
  (await cookies()).delete(OTP_COOKIE);
}

export { mailConfigured };
