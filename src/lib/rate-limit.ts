import "server-only";
import { db } from "./db";

/**
 * Fixed-window limiter backed by Postgres so limits survive restarts and are
 * shared across instances. Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const row = await db.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } });
    if (!existing || existing.resetAt < now) {
      return tx.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
    }
    return tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  });

  // Opportunistic cleanup of stale windows.
  if (Math.random() < 0.02) {
    await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => {});
  }

  return row.count <= limit;
}
