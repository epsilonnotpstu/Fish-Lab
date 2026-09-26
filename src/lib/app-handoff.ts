import "server-only";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";

/**
 * Google blocks OAuth inside embedded web views, so the Android app opens the
 * flow in the system browser. The browser cannot share its cookies with the
 * app, so it finishes by handing the app a single-use token which the app
 * exchanges for its own session.
 */
const PURPOSE = "app-handoff";
const TTL_MS = 2 * 60 * 1000;

export async function createHandoffToken(userId: string, email: string) {
  const token = randomToken(32);
  await db.otpChallenge.create({
    data: {
      email,
      purpose: PURPOSE,
      codeHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return token;
}

export async function consumeHandoffToken(token: string) {
  if (!token || token.length > 200) return null;
  const challenge = await db.otpChallenge.findFirst({
    where: { purpose: PURPOSE, codeHash: sha256(token), consumedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!challenge?.userId) return null;
  // Single use.
  const consumed = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) return null;
  return challenge.userId;
}
