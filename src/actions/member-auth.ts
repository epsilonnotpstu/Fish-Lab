"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { clearChallenge, startChallenge, verifyChallenge } from "@/lib/otp";
import { getResource } from "@/lib/admin/resources";
import { toPrismaData, validateFields, type FieldErrors } from "@/lib/admin/resource-server";

export type MemberAuthState =
  | {
      step?: "email" | "otp";
      email?: string;
      error?: string;
      purpose?: "signup" | "login";
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

export async function requestSignupCode(_prev: MemberAuthState, formData: FormData): Promise<MemberAuthState> {
  const name = nameSchema.safeParse(formData.get("name") ?? "");
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!name.success) return { step: "email", error: name.error.issues[0].message };
  if (!email.success) return { step: "email", error: email.error.issues[0].message };
  if (String(formData.get("website") ?? "")) {
    return { step: "otp", email: email.data, purpose: "signup", sentAt: new Date().toISOString() };
  }
  if (!(await throttle(email.data))) return { step: "email", error: "Too many requests. Please try again later." };

  const existing = await db.user.findUnique({ where: { email: email.data } });
  try {
    if (!existing) {
      await startChallenge({ email: email.data, purpose: "signup", name: name.data });
      console.info("otp: signup code sent");
    } else if (existing.active && existing.role === "MEMBER") {
      // Already registered: send a sign-in code instead (does not reveal the account exists).
      await startChallenge({ email: email.data, purpose: "login", userId: existing.id });
      console.info("otp: existing member, login code sent");
    } else {
      // Staff accounts are never signed in by email code alone; respond identically.
      console.info("otp: skipped (staff or disabled account)");
    }
  } catch (err) {
    console.error("otp: send failed", err instanceof Error ? err.message : err);
    return { step: "email", error: "We could not send the email. Please try again later." };
  }
  return { step: "otp", email: email.data, purpose: "signup", sentAt: new Date().toISOString() };
}

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
      // Link to a published member profile with the same email, if one is unclaimed.
      const profile = await db.member.findFirst({ where: { email: { equals: c.email, mode: "insensitive" }, account: null } });
      const user = await db.user.create({
        data: { email: c.email, name: c.name || c.email.split("@")[0], role: "MEMBER", memberId: profile?.id },
      });
      userId = user.id;
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

// ─── Self-service profile ────────────────────────────────────────────────────

const SELF_EDITABLE = ["photo", "phone", "bio", "researchInterests", "education", "links"];

export async function updateOwnProfile(
  input: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; fieldErrors?: FieldErrors }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  const account = await db.user.findUnique({ where: { id: me.id }, select: { memberId: true, active: true } });
  if (!account?.active || !account.memberId) return { ok: false, error: "Your account is not linked to a member profile yet." };

  const fields = getResource("members")!.fields.filter((f) => SELF_EDITABLE.includes(f.name));
  const { values, errors } = validateFields(fields, input ?? {});
  if (Object.keys(errors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors };

  await db.member.update({ where: { id: account.memberId }, data: toPrismaData(fields, values, "update") });
  await audit(me.id, "update own profile", "Member", account.memberId);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAccountName(input: { name: string }): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  const name = nameSchema.safeParse(input?.name ?? "");
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  await db.user.update({ where: { id: me.id }, data: { name: name.data } });
  return { ok: true };
}
