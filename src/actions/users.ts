"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUser, audit, AuthError, hashPassword, passwordPolicyError } from "@/lib/auth";
import type { ActionResult } from "./resources";

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i);
const roleSchema = z.enum(["SUPER_ADMIN", "EDITOR", "MEMBER"]);

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  role: z.enum(["SUPER_ADMIN", "EDITOR"]),
  password: z.string().max(128),
});

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Please fill in every field correctly." };
    const { name, role, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const policy = passwordPolicyError(password);
    if (policy) return { ok: false, error: policy };
    if (await db.user.findUnique({ where: { email } })) {
      return { ok: false, error: "A user with this email already exists." };
    }
    const user = await db.user.create({
      data: { name, email, role, passwordHash: await hashPassword(password), mustChangePassword: true },
    });
    await audit(me.id, "create", "User", user.id, email);
    revalidatePath("/admin/users");
    return { ok: true, id: user.id };
  } catch (err) {
    return fail(err);
  }
}

const updateSchema = z.object({
  id: idSchema,
  role: roleSchema,
  active: z.boolean(),
  memberId: idSchema.nullable(),
});

async function superAdminCount() {
  return db.user.count({ where: { role: "SUPER_ADMIN", active: true } });
}

export async function updateUser(input: unknown): Promise<ActionResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid request." };
    const { id, role, active, memberId } = parsed.data;
    if (id === me.id && (role !== me.role || !active)) {
      return { ok: false, error: "You cannot change your own role or disable yourself." };
    }
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return { ok: false, error: "User not found." };

    const demoting = target.role === "SUPER_ADMIN" && target.active && (role !== "SUPER_ADMIN" || !active);
    if (demoting && (await superAdminCount()) <= 1) {
      return { ok: false, error: "There must always be at least one active super admin." };
    }
    if (role !== "MEMBER" && !target.passwordHash) {
      return { ok: false, error: "Set a password for this user first (Reset password), then change the role." };
    }
    if (memberId) {
      const taken = await db.user.findFirst({ where: { memberId, NOT: { id } } });
      if (taken) return { ok: false, error: "That member profile is already linked to another account." };
    }
    await db.user.update({ where: { id }, data: { role, active, memberId } });
    // Role or status changes take effect immediately.
    if (!active || role !== target.role) await db.session.deleteMany({ where: { userId: id } });
    await audit(me.id, "update", "User", id, `${target.email}: ${role}${active ? "" : " (disabled)"}`);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function resetUserPassword(input: unknown): Promise<ActionResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    const parsed = z.object({ id: idSchema, password: z.string().max(128) }).safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid request." };
    const policy = passwordPolicyError(parsed.data.password);
    if (policy) return { ok: false, error: policy };
    await db.$transaction([
      db.user.update({
        where: { id: parsed.data.id },
        data: {
          passwordHash: await hashPassword(parsed.data.password),
          mustChangePassword: true,
          failedAttempts: 0,
          lockedUntil: null,
        },
      }),
      db.session.deleteMany({ where: { userId: parsed.data.id } }),
    ]);
    await audit(me.id, "reset password", "User", parsed.data.id);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };
    if (id === me.id) return { ok: false, error: "You cannot delete your own account." };
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return { ok: false, error: "User not found." };
    if (target.role === "SUPER_ADMIN" && (await superAdminCount()) <= 1) {
      return { ok: false, error: "There must always be at least one active super admin." };
    }
    await db.user.delete({ where: { id } });
    await audit(me.id, "delete", "User", id, target.email);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function revokeSessions(id: string): Promise<ActionResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };
    await db.session.deleteMany({ where: { userId: id } });
    await audit(me.id, "revoke sessions", "User", id);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
