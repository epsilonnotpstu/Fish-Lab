"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUser, audit, AuthError } from "@/lib/auth";
import type { ActionResult } from "./resources";

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i);

export async function setMessageRead(id: string, read: boolean): Promise<ActionResult> {
  try {
    await assertUser();
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };
    await db.contactMessage.update({ where: { id }, data: { read: Boolean(read) } });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not update message." };
  }
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  try {
    const me = await assertUser();
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };
    await db.contactMessage.delete({ where: { id } });
    await audit(me.id, "delete", "Message", id);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "Could not delete message." };
  }
}
