"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUser, audit, AuthError, getCurrentUser, isStaff } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";
import { ceremonyArmed, CEREMONY_COOKIE } from "@/lib/inauguration";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";

export type InaugurateResult = { ok: boolean; error?: string; at?: string };

/** The ceremony itself: performed once, by the guest's link or by staff. */
export async function inaugurate(key: string): Promise<InaugurateResult> {
  if (!(await rateLimit(`inaugurate:${await clientIpHash()}`, 10, 15 * 60 * 1000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment." };
  }
  const settings = await getSettings();
  if (!settings.inaugurationEnabled) return { ok: false, error: "The ceremony is not open." };
  if (settings.inauguratedAt) return { ok: true, at: settings.inauguratedAt.toISOString() };

  const parsed = z.string().max(120).safeParse(key ?? "");
  if (!(await ceremonyArmed(settings, parsed.success ? parsed.data : ""))) {
    return { ok: false, error: "This device is not allowed to start the ceremony." };
  }

  const at = new Date();
  const updated = await db.siteSettings.updateMany({ where: { id: 1, inauguratedAt: null }, data: { inauguratedAt: at } });
  const user = await getCurrentUser();
  await audit(user?.id ?? null, "inaugurate", "Website", "", settings.ceremonyGuestName || "Ceremony");
  // The page is refreshed by the ceremony screen once the animation has played.

  const current = updated.count === 1 ? at : (await getSettings()).inauguratedAt ?? at;
  return { ok: true, at: current.toISOString() };
}

/** Remember the guest's key on their device, so a refresh keeps the button. */
export async function armCeremony(key: string): Promise<{ ok: boolean }> {
  const settings = await getSettings();
  if (!settings.inaugurationKey || key !== settings.inaugurationKey) return { ok: false };
  (await cookies()).set(CEREMONY_COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return { ok: true };
}

export async function resetInauguration(): Promise<InaugurateResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    await db.siteSettings.update({ where: { id: 1 }, data: { inauguratedAt: null } });
    await audit(me.id, "reset inauguration", "Website");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not reset the ceremony." };
  }
}

export async function regenerateCeremonyKey(): Promise<{ ok: boolean; key?: string; error?: string }> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    const key = randomToken(18);
    await db.siteSettings.update({ where: { id: 1 }, data: { inaugurationKey: key } });
    await audit(me.id, "regenerate ceremony link", "Website");
    revalidatePath("/admin/inauguration");
    return { ok: true, key };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not create a new link." };
  }
}

/** Turn the waiting screen on or off without touching the recorded date. */
export async function setCeremonyMode(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const me = await assertUser();
    if (!isStaff(me.role)) return { ok: false, error: "Not allowed." };
    const settings = await getSettings();
    const key = settings.inaugurationKey || randomToken(18);
    await db.siteSettings.update({
      where: { id: 1 },
      data: { inaugurationEnabled: Boolean(enabled), inaugurationKey: key },
    });
    await audit(me.id, enabled ? "open ceremony" : "close ceremony", "Website");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not change the ceremony mode." };
  }
}
