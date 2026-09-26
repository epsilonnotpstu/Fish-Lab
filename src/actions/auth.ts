"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getCurrentUser,
  audit,
  burnPasswordCheck,
  createSession,
  destroySession,
  hashPassword,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  passwordPolicyError,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { sha256 } from "@/lib/crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, adminTwoFactorEnabled, isStaff } from "@/lib/auth";
import { clearChallenge, startChallenge, verifyChallenge } from "@/lib/otp";

export type FormState = { error?: string; success?: string; step?: "otp"; email?: string } | undefined;

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: GENERIC_LOGIN_ERROR };
  const { email, password } = parsed.data;

  const ip = await clientIpHash();
  const allowed = await rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!allowed) return { error: "Too many login attempts. Please wait 15 minutes and try again." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !isStaff(user.role) || !user.passwordHash) {
    await burnPasswordCheck(password);
    return { error: GENERIC_LOGIN_ERROR };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await burnPasswordCheck(password);
    return { error: "This account is temporarily locked after repeated failed logins. Try again later." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedAttempts + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
    if (failed >= MAX_FAILED_LOGINS) await audit(user.id, "locked", "User", user.id, "Too many failed logins");
    return { error: GENERIC_LOGIN_ERROR };
  }

  await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });

  if (adminTwoFactorEnabled()) {
    try {
      await startChallenge({ email: user.email, purpose: "admin-2fa", userId: user.id });
    } catch {
      return { error: "Could not send the verification email. Please try again." };
    }
    return { step: "otp", email: maskEmail(user.email) };
  }
  return finishStaffLogin(user.id, user.mustChangePassword);
}

async function finishStaffLogin(userId: string, mustChangePassword: boolean): Promise<never> {
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  // Drop expired sessions for this user while we are here.
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await createSession(userId);
  await audit(userId, "login", "User", userId);
  redirect(mustChangePassword ? "/admin/account?first=1" : "/admin");
}

export async function verifyAdminCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIpHash();
  if (!(await rateLimit(`otp-verify:${ip}`, 20, 15 * 60 * 1000))) {
    return { step: "otp", error: "Too many attempts. Please wait and try again." };
  }
  const result = await verifyChallenge("admin-2fa", String(formData.get("code") ?? "").slice(0, 12));
  if (!result.ok) return { step: "otp", error: result.error };
  const user = result.challenge.userId ? await db.user.findUnique({ where: { id: result.challenge.userId } }) : null;
  if (!user || !user.active || !isStaff(user.role)) return { error: GENERIC_LOGIN_ERROR };
  return finishStaffLogin(user.id, user.mustChangePassword);
}

export async function cancelOtpAction(): Promise<FormState> {
  await clearChallenge();
  return undefined;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

const changePasswordSchema = z.object({
  current: z.string().min(1).max(128),
  next: z.string().max(128),
  confirm: z.string().max(128),
});

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) return { error: "You are not signed in." };
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fill in all fields." };
  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return { error: "New passwords do not match." };
  const policy = passwordPolicyError(next);
  if (policy) return { error: policy };
  if (next === current) return { error: "New password must be different from the current one." };

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect." };

  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db.$transaction([
    db.user.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(next), mustChangePassword: false },
    }),
    // Sign out every other device.
    db.session.deleteMany({ where: { userId: me.id, NOT: { tokenHash: sha256(token) } } }),
  ]);
  await audit(me.id, "change password", "User", me.id);
  return { success: "Password updated. Other sessions have been signed out." };
}

const profileSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) return { error: "You are not signed in." };
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Please enter your name." };
  await db.user.update({ where: { id: me.id }, data: { name: parsed.data.name } });
  return { success: "Profile updated." };
}
