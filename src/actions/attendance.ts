"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUser, audit, AuthError, getCurrentUser, isStaff } from "@/lib/auth";
import { memberAccess } from "@/lib/member-account";
import { getSettings } from "@/lib/settings";
import { distanceMeters, labDay } from "@/lib/geo";
import { rateLimit } from "@/lib/rate-limit";

export type AttendanceResult = {
  ok: boolean;
  error?: string;
  distance?: number | null;
  withinFence?: boolean;
};

const pointSchema = z.object({
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  accuracy: z.number().min(0).max(100_000).nullable().optional(),
  source: z.enum(["WEB", "APP"]).default("WEB"),
});

async function requireApprovedMember() {
  const me = await getCurrentUser();
  if (!me || isStaff(me.role)) throw new AuthError("You are not signed in as a member.");
  const access = await memberAccess(me.id);
  if (!access.memberId) throw new AuthError("Your account is not linked to a member profile yet.");
  if (!access.approved) throw new AuthError("Your membership is still waiting for approval.");
  return { userId: me.id, memberId: access.memberId };
}

/** Distance from the lab, and whether that is close enough to count. */
async function checkLocation(lat?: number | null, lng?: number | null) {
  const settings = await getSettings();
  const labLat = Number(settings.labLat);
  const labLng = Number(settings.labLng);
  const hasLab = Number.isFinite(labLat) && Number.isFinite(labLng) && settings.labLat !== "" && settings.labLng !== "";
  if (!hasLab || lat == null || lng == null) {
    // Without a configured lab point (or without permission) we still record
    // the attempt, but cannot verify the distance.
    return { distance: null, withinFence: !settings.attendanceRequiresFence || !hasLab, requiresFence: settings.attendanceRequiresFence && hasLab };
  }
  const distance = distanceMeters({ lat, lng }, { lat: labLat, lng: labLng });
  return {
    distance,
    withinFence: distance <= settings.attendanceRadiusMeters,
    requiresFence: settings.attendanceRequiresFence,
  };
}

export async function checkIn(input: unknown): Promise<AttendanceResult> {
  try {
    const { userId, memberId } = await requireApprovedMember();
    const parsed = pointSchema.safeParse(input ?? {});
    if (!parsed.success) return { ok: false, error: "Invalid location data." };
    if (!(await rateLimit(`attendance:${userId}`, 30, 60 * 60 * 1000))) {
      return { ok: false, error: "Too many attempts. Please try again later." };
    }

    const { lat, lng, accuracy, source } = parsed.data;
    const { distance, withinFence, requiresFence } = await checkLocation(lat, lng);
    if (requiresFence && !withinFence) {
      return {
        ok: false,
        distance,
        withinFence: false,
        error:
          distance == null
            ? "We could not read your location. Allow location access and try again."
            : `You seem to be about ${distance} m from the lab. Attendance can only be marked at the laboratory.`,
      };
    }

    const day = labDay();
    const existing = await db.attendance.findUnique({ where: { memberId_day: { memberId, day } } });
    if (existing) return { ok: false, error: "You have already marked attendance today.", distance, withinFence };

    await db.attendance.create({
      data: {
        memberId,
        day,
        checkInLat: lat ?? null,
        checkInLng: lng ?? null,
        checkInAccuracy: accuracy ?? null,
        distanceMeters: distance,
        withinFence,
        source,
        createdById: userId,
      },
    });
    await audit(userId, "check in", "Attendance", memberId, day);
    revalidatePath("/account/attendance");
    return { ok: true, distance, withinFence };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Could not record attendance. Please try again." };
  }
}

export async function checkOut(input: unknown): Promise<AttendanceResult> {
  try {
    const { userId, memberId } = await requireApprovedMember();
    const parsed = pointSchema.safeParse(input ?? {});
    if (!parsed.success) return { ok: false, error: "Invalid location data." };

    const day = labDay();
    const existing = await db.attendance.findUnique({ where: { memberId_day: { memberId, day } } });
    if (!existing) return { ok: false, error: "You have not checked in today." };
    if (existing.checkOutAt) return { ok: false, error: "You have already checked out today." };

    await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutAt: new Date(),
        checkOutLat: parsed.data.lat ?? null,
        checkOutLng: parsed.data.lng ?? null,
      },
    });
    await audit(userId, "check out", "Attendance", memberId, day);
    revalidatePath("/account/attendance");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Could not record check-out. Please try again." };
  }
}

// ─── Staff corrections ───────────────────────────────────────────────────────

export async function adminCloseAttendance(id: string): Promise<AttendanceResult> {
  try {
    const me = await assertUser();
    if (!/^[a-z0-9]{10,40}$/i.test(id)) return { ok: false, error: "Invalid request." };
    await db.attendance.update({ where: { id }, data: { checkOutAt: new Date() } });
    await audit(me.id, "close attendance", "Attendance", id);
    revalidatePath("/admin/attendance");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update the record." };
  }
}

export async function adminDeleteAttendance(id: string): Promise<AttendanceResult> {
  try {
    const me = await assertUser();
    if (!/^[a-z0-9]{10,40}$/i.test(id)) return { ok: false, error: "Invalid request." };
    await db.attendance.delete({ where: { id } });
    await audit(me.id, "delete attendance", "Attendance", id);
    revalidatePath("/admin/attendance");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not delete the record." };
  }
}

export async function adminMarkPresent(memberId: string, note: string): Promise<AttendanceResult> {
  try {
    const me = await assertUser();
    const parsed = z.object({ memberId: z.string().regex(/^[a-z0-9]{10,40}$/i), note: z.string().trim().max(200) }).safeParse({ memberId, note });
    if (!parsed.success) return { ok: false, error: "Invalid request." };
    const day = labDay();
    await db.attendance.upsert({
      where: { memberId_day: { memberId: parsed.data.memberId, day } },
      create: { memberId: parsed.data.memberId, day, note: parsed.data.note || "Added by staff", withinFence: true, source: "WEB", createdById: me.id },
      update: { note: parsed.data.note || "Updated by staff" },
    });
    await audit(me.id, "mark present", "Attendance", parsed.data.memberId, day);
    revalidatePath("/admin/attendance");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not add the record." };
  }
}
