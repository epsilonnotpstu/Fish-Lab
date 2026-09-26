"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { memberAccess } from "@/lib/member-account";
import { pushConfigured, pushToUsers } from "@/lib/push";

const tokenSchema = z.object({
  token: z.string().min(20).max(512),
  platform: z.enum(["WEB", "ANDROID"]).default("WEB"),
  deviceName: z.string().max(120).default(""),
});

/** Store a device token so the lab can notify this user. */
export async function registerPushToken(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  if (!isStaff(me.role)) {
    const access = await memberAccess(me.id);
    if (!access.approved) return { ok: false, error: "Your membership is still waiting for approval." };
  }
  const parsed = tokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid token." };

  await db.pushToken.upsert({
    where: { token: parsed.data.token },
    create: { ...parsed.data, userId: me.id },
    update: { userId: me.id, platform: parsed.data.platform, deviceName: parsed.data.deviceName, lastSeenAt: new Date() },
  });
  return { ok: true };
}

export async function unregisterPushToken(token: string): Promise<{ ok: boolean }> {
  const me = await getCurrentUser();
  if (!me || typeof token !== "string") return { ok: false };
  await db.pushToken.deleteMany({ where: { token, userId: me.id } });
  return { ok: true };
}

/** Send a test notification to the signed-in user's own devices. */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string; sent?: number }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  if (!pushConfigured()) return { ok: false, error: "Push notifications are not configured yet." };
  const { sent } = await pushToUsers([me.id], {
    title: "Test notification",
    body: "Notifications are working on this device.",
    link: "/account",
    tag: "test",
  });
  return sent > 0 ? { ok: true, sent } : { ok: false, error: "No device is registered for notifications yet." };
}
