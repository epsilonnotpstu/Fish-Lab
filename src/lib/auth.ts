import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { clientIpHash, userAgent } from "./request";

export const SESSION_COOKIE = "lab_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const BCRYPT_COST = 12;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 1000 * 60 * 15;

export type SessionUser = Pick<User, "id" | "name" | "email" | "role" | "mustChangePassword">;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string) {
  if (!hash) return false;
  return bcrypt.compare(password, hash).catch(() => false);
}

export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "EDITOR"];
export const isStaff = (role: Role) => STAFF_ROLES.includes(role);

/** Admin sign-in requires an emailed code as a second factor when enabled. */
export function adminTwoFactorEnabled() {
  return process.env.ADMIN_2FA === "true";
}

// Used when the email is unknown so response time does not reveal which
// accounts exist.
const DUMMY_HASH = "$2b$12$.DF0FLcm4qFWhwa8k/GOlOzTBYVV1eDH6cjO2NCOGiwCr24uyILYS";
export async function burnPasswordCheck(password: string) {
  await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 128) return "Password is too long.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Password must include upper-case, lower-case letters and a number.";
  }
  return null;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      userAgent: await userAgent(),
      ipHash: await clientIpHash(),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Resolve the current admin from the session cookie (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, active: true, mustChangePassword: true },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || !session.user.active) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const { id, name, email, role, mustChangePassword } = session.user;
  return { id, name, email, role, mustChangePassword };
});

/** For admin pages: redirect to login when not signed in / not staff / not allowed. */
export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isStaff(user.role)) redirect("/account");
  if (role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") redirect("/admin?denied=1");
  return user;
}

export class AuthError extends Error {}

/** For server actions / route handlers: throw instead of redirecting. */
export async function assertUser(role?: Role) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You are not signed in.");
  if (!isStaff(user.role)) throw new AuthError("You do not have permission to do that.");
  if (user.mustChangePassword) throw new AuthError("Please change your password before making changes.");
  if (role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new AuthError("You do not have permission to do that.");
  }
  return user;
}

/** For the member portal: any signed-in account. */
export async function requireAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  return user;
}

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId = "",
  summary = "",
) {
  await db.auditLog
    .create({ data: { userId, action, entity, entityId, summary: summary.slice(0, 300) } })
    .catch(() => {});
}
