"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  adminTwoFactorEnabled,
  audit,
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  isStaff,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  passwordPolicyError,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { clearChallenge, startChallenge, verifyChallenge } from "@/lib/otp";
import { getSettings } from "@/lib/settings";
import { memberEditableFields } from "@/lib/member-fields";
import { createPendingMember, memberAccess, validateApplication } from "@/lib/member-account";
import { toPrismaData, validateFields, type FieldErrors } from "@/lib/admin/resource-server";

export type MemberAuthState =
  | {
      step?: "email" | "otp";
      email?: string;
      error?: string;
      purpose?: "signup" | "login" | "staff";
      /** Set every time a code is sent, so the UI can confirm each send. */
      sentAt?: string;
    }
  | undefined;

const emailSchema = z.email("Please enter a valid email address.").max(254);
const nameSchema = z.string().trim().min(2, "Please enter your full name.").max(120);

async function throttle(email: string) {
  const ip = await clientIpHash();
  // A whole campus can share one address, so the per-IP budget is generous;
  // the per-address limit is what stops someone being spammed with codes.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`otp-send-ip:${ip}`, 40, 60 * 60 * 1000),
    rateLimit(`otp-send-email:${email}`, 5, 60 * 60 * 1000),
  ]);
  return byIp && byEmail;
}

// ─── Sign-up (application + email verification) ──────────────────────────────

export type ApplyState = {
  ok?: boolean;
  email?: string;
  sentAt?: string;
  error?: string;
  fieldErrors?: FieldErrors;
};

const accountSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().max(128),
});

/**
 * Step 1 of sign-up: validate the whole application, keep it (with the password
 * already hashed) on the e-mail challenge, and send the verification code. The
 * account is only created once the code is confirmed.
 */
export async function startApplication(input: {
  account: { name: string; email: string; password: string };
  profile: Record<string, unknown>;
  website?: string;
}): Promise<ApplyState> {
  const settings = await getSettings();
  if (!settings.memberSignupEnabled) return { error: "Member sign-up is currently closed." };
  if (input?.website) return { ok: true, email: input?.account?.email, sentAt: new Date().toISOString() };

  const account = accountSchema.safeParse({
    name: input?.account?.name ?? "",
    email: String(input?.account?.email ?? "").trim().toLowerCase(),
    password: input?.account?.password ?? "",
  });
  if (!account.success) {
    const issue = account.error.issues[0];
    return { error: issue.message, fieldErrors: { [String(issue.path[0] ?? "email")]: issue.message } };
  }
  const policy = passwordPolicyError(account.data.password);
  if (policy) return { error: policy, fieldErrors: { password: policy } };

  const application = validateApplication(input?.profile ?? {});
  if (!application.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: application.fieldErrors };
  }

  const { name, email, password } = account.data;
  if (!(await throttle(email))) return { error: "Too many requests. Please try again later." };

  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    return {
      error: isStaff(existing.role)
        ? "This email belongs to a staff account. Please sign in at /admin instead."
        : "An account with this email already exists — please sign in instead.",
      fieldErrors: { email: "Already registered" },
    };
  }

  try {
    await startChallenge({
      email,
      purpose: "signup",
      name,
      payload: { passwordHash: await hashPassword(password), profile: application.values },
    });
    console.info("otp: signup code sent");
  } catch (err) {
    console.error("otp: send failed", err instanceof Error ? err.message : err);
    return { error: "We could not send the verification email. Please try again later." };
  }
  return { ok: true, email, sentAt: new Date().toISOString() };
}

/** Resend the code for an application that is already waiting for verification. */
export async function resendApplicationCode(email: string): Promise<ApplyState> {
  const parsed = emailSchema.safeParse(String(email ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: "Invalid email address." };
  const challenge = await db.otpChallenge.findFirst({
    where: { email: parsed.data, purpose: "signup", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { error: "This sign-up has expired. Please start again." };
  if (!(await throttle(parsed.data))) return { error: "Too many requests. Please try again later." };
  try {
    await startChallenge({
      email: challenge.email,
      purpose: "signup",
      name: challenge.name,
      payload: challenge.payload as Record<string, unknown>,
    });
  } catch {
    return { error: "We could not send the email. Please try again later." };
  }
  return { ok: true, email: parsed.data, sentAt: new Date().toISOString() };
}

// ─── Sign-in ─────────────────────────────────────────────────────────────────

export async function requestLoginCode(_prev: MemberAuthState, formData: FormData): Promise<MemberAuthState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { step: "email", error: email.error.issues[0].message };
  if (!(await throttle(email.data))) return { step: "email", error: "Too many requests. Please try again later." };

  const user = await db.user.findUnique({ where: { email: email.data } });
  try {
    if (user && user.active && user.role === "MEMBER") {
      await startChallenge({ email: email.data, purpose: "login", userId: user.id });
      console.info("otp: login code sent");
    } else {
      console.info("otp: login skipped (no member account)");
    }
  } catch (err) {
    console.error("otp: send failed", err instanceof Error ? err.message : err);
    return { step: "email", error: "We could not send the email. Please try again later." };
  }
  // Same response whether or not the account exists.
  return { step: "otp", email: email.data, purpose: "login", sentAt: new Date().toISOString() };
}

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

/**
 * One password form for everybody. Staff and members follow their own rules —
 * staff get the lockout, the optional emailed second step and an audit entry,
 * members go straight to the portal — but the reply looks the same either way,
 * so the form never reveals which addresses belong to staff.
 */
export async function loginWithPassword(_prev: MemberAuthState, formData: FormData): Promise<MemberAuthState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .safeParse({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
    });
  if (!parsed.success) return { step: "email", error: GENERIC_LOGIN_ERROR };

  const ip = await clientIpHash();
  if (!(await rateLimit(`password-login:${ip}`, 20, 15 * 60 * 1000))) {
    return { step: "email", error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.active || !user.passwordHash) {
    // Always spend the same time, so a missing account is indistinguishable.
    await verifyPassword(parsed.data.password, "$2b$12$.DF0FLcm4qFWhwa8k/GOlOzTBYVV1eDH6cjO2NCOGiwCr24uyILYS");
    return { step: "email", error: GENERIC_LOGIN_ERROR };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { step: "email", error: "This account is temporarily locked after repeated failed sign-ins. Try again later." };
  }

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    const failed = user.failedAttempts + 1;
    const locked = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: locked ? 0 : failed,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
    if (locked && isStaff(user.role)) await audit(user.id, "locked", "User", user.id, "Too many failed logins");
    return { step: "email", error: GENERIC_LOGIN_ERROR };
  }

  await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });

  if (isStaff(user.role)) {
    if (adminTwoFactorEnabled()) {
      try {
        await startChallenge({ email: user.email, purpose: "admin-2fa", userId: user.id });
      } catch {
        return { step: "email", error: "Could not send the verification email. Please try again." };
      }
      return { step: "otp", purpose: "staff", email: maskEmail(user.email), sentAt: new Date().toISOString() };
    }
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await db.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
    await createSession(user.id);
    await audit(user.id, "login", "User", user.id);
    redirect(user.mustChangePassword ? "/admin/account?first=1" : "/admin");
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect("/account");
}

/** Second step of a staff sign-in started from the shared login form. */
export async function verifyStaffCode(_prev: MemberAuthState, formData: FormData): Promise<MemberAuthState> {
  const ip = await clientIpHash();
  if (!(await rateLimit(`otp-verify:${ip}`, 20, 15 * 60 * 1000))) {
    return { step: "otp", purpose: "staff", error: "Too many attempts. Please wait and try again." };
  }
  const result = await verifyChallenge("admin-2fa", String(formData.get("code") ?? "").slice(0, 12));
  if (!result.ok) return { step: "otp", purpose: "staff", error: result.error };

  const user = result.challenge.userId ? await db.user.findUnique({ where: { id: result.challenge.userId } }) : null;
  if (!user || !user.active || !isStaff(user.role)) return { step: "email", error: GENERIC_LOGIN_ERROR };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit(user.id, "login", "User", user.id);
  redirect(user.mustChangePassword ? "/admin/account?first=1" : "/admin");
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export async function verifyMemberCode(prev: MemberAuthState, formData: FormData): Promise<MemberAuthState> {
  const ip = await clientIpHash();
  if (!(await rateLimit(`otp-verify:${ip}`, 20, 15 * 60 * 1000))) {
    return { ...prev, step: "otp", error: "Too many attempts. Please wait and try again." };
  }
  const result = await verifyChallenge(["signup", "login"], String(formData.get("code") ?? "").slice(0, 12));
  if (!result.ok) return { ...prev, step: "otp", error: result.error };
  const c = result.challenge;

  let userId: string;
  if (c.purpose === "signup") {
    const existing = await db.user.findUnique({ where: { email: c.email } });
    if (existing) {
      if (existing.role !== "MEMBER" || !existing.active) return { step: "email", error: "Please sign in instead." };
      userId = existing.id;
    } else {
      const payload = (c.payload ?? {}) as { passwordHash?: string; profile?: Record<string, unknown> };
      const user = await db.user.create({
        data: {
          email: c.email,
          name: c.name || c.email.split("@")[0],
          role: "MEMBER",
          passwordHash: payload.passwordHash ?? "",
        },
      });
      userId = user.id;
      if (payload.profile) {
        await createPendingMember(user, payload.profile);
      }
      await audit(user.id, "sign up", "Member account", user.id, c.email);
    }
  } else {
    const user = c.userId ? await db.user.findUnique({ where: { id: c.userId } }) : null;
    if (!user || !user.active || user.role !== "MEMBER") return { step: "email", error: "This account cannot sign in here." };
    userId = user.id;
  }

  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  await createSession(userId);
  redirect("/account");
}

export async function restartMemberAuth(): Promise<MemberAuthState> {
  await clearChallenge();
  return { step: "email" };
}

export async function memberLogoutAction() {
  await destroySession();
  redirect("/account/login");
}

// ─── Profile & application for signed-in members ─────────────────────────────

/** A member who signed in with Google still has to submit the application. */
export async function submitApplication(
  profile: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; fieldErrors?: FieldErrors }> {
  const me = await getCurrentUser();
  if (!me || isStaff(me.role)) return { ok: false, error: "You are not signed in as a member." };
  const account = await db.user.findUnique({ where: { id: me.id }, select: { memberId: true, name: true, email: true } });
  if (account?.memberId) return { ok: false, error: "Your profile has already been submitted." };

  const application = validateApplication(profile ?? {});
  if (!application.ok) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: application.fieldErrors };

  await createPendingMember({ id: me.id, name: account?.name ?? me.name, email: account?.email ?? me.email }, application.values);
  await audit(me.id, "submit application", "Member", me.id);
  revalidatePath("/account");
  return { ok: true };
}

/** After a rejection the member can fix their details and ask for another look. */
export async function resubmitApplication(): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me || isStaff(me.role)) return { ok: false, error: "You are not signed in as a member." };
  const access = await memberAccess(me.id);
  if (!access.memberId) return { ok: false, error: "No profile to submit." };
  if (access.status !== "REJECTED") return { ok: false, error: "This profile is not awaiting changes." };

  await db.member.update({
    where: { id: access.memberId },
    data: { status: "PENDING", reviewNote: "", appliedAt: new Date() },
  });
  await audit(me.id, "resubmit application", "Member", access.memberId);
  revalidatePath("/account");
  return { ok: true };
}

export async function updateOwnProfile(
  input: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; fieldErrors?: FieldErrors }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  const access = await memberAccess(me.id);
  if (!access.memberId) return { ok: false, error: "Your account is not linked to a member profile yet." };
  if (!access.active) return { ok: false, error: "This account is disabled." };

  const { values, errors } = validateFields(memberEditableFields, input ?? {});
  if (Object.keys(errors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors };

  await db.member.update({
    where: { id: access.memberId },
    data: toPrismaData(memberEditableFields, values, "update"),
  });
  await audit(me.id, "update own profile", "Member", access.memberId);
  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordSchema = z.object({
  current: z.string().max(128).default(""),
  next: z.string().max(128),
  confirm: z.string().max(128),
});

export async function changeOwnPassword(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fill in every field." };
  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return { ok: false, error: "New passwords do not match." };
  const policy = passwordPolicyError(next);
  if (policy) return { ok: false, error: policy };

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  // Accounts created through Google have no password yet, so there is nothing
  // to confirm the first time they set one.
  if (user.passwordHash && !(await verifyPassword(current, user.passwordHash))) {
    return { ok: false, error: "Current password is incorrect." };
  }
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(me.id, "change password", "Member account", me.id);
  return { ok: true };
}

export async function updateNotificationPrefs(input: { notifyChat?: boolean; notifyNotices?: boolean }) {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  await db.user.update({
    where: { id: me.id },
    data: {
      notifyChat: Boolean(input?.notifyChat),
      notifyNotices: Boolean(input?.notifyNotices),
    },
  });
  return { ok: true };
}
