"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertUser, audit, AuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getResource, settingsFields } from "@/lib/admin/resources";
import {
  delegate,
  friendlyDbError,
  getRecord,
  toPrismaData,
  validateFields,
  type FieldErrors,
} from "@/lib/admin/resource-server";

export type ActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  id?: string;
};

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i);

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  return { ok: false, error: friendlyDbError(err) };
}

async function authorise(key: string) {
  const resource = getResource(key);
  if (!resource) throw new AuthError("Unknown collection.");
  const user = await assertUser(resource.superAdminOnly ? "SUPER_ADMIN" : undefined);
  return { resource, user };
}

function refreshSite() {
  // Public pages read from the DB on each request; this also clears the
  // client router cache so admins see their edits immediately.
  revalidatePath("/", "layout");
}

export async function saveResource(
  key: string,
  recordId: string | null,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const { resource, user } = await authorise(key);
    if (recordId !== null && !idSchema.safeParse(recordId).success) {
      return { ok: false, error: "Invalid record." };
    }
    if (!input || typeof input !== "object") return { ok: false, error: "Invalid input." };

    const { values, errors } = validateFields(resource.fields, input);
    if (Object.keys(errors).length) {
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors };
    }

    // A menu item cannot be its own parent.
    if (resource.key === "navigation" && recordId && values.parent === recordId) {
      return { ok: false, fieldErrors: { parent: "An item cannot be its own parent." } };
    }

    const d = delegate(resource);
    let id = recordId;
    if (recordId) {
      const existing = await getRecord(resource, recordId);
      if (!existing) return { ok: false, error: "This item no longer exists." };
      const data = toPrismaData(
        resource.fields,
        values,
        "update",
        (existing.content ?? {}) as Record<string, unknown>,
      );
      await d.update({ where: { id: recordId }, data });
    } else {
      const data = toPrismaData(resource.fields, values, "create");
      if (resource.orderable) {
        const last = await d.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
        data.order = (last?.order ?? -1) + 1;
      }
      const created = await d.create({ data, select: { id: true } });
      id = created.id;
    }

    const title = String(values[resource.titleField] ?? values.type ?? "");
    await audit(user.id, recordId ? "update" : "create", resource.singular, id ?? "", title);
    refreshSite();
    return { ok: true, id: id ?? undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteResource(key: string, recordId: string): Promise<ActionResult> {
  try {
    const { resource, user } = await authorise(key);
    if (!idSchema.safeParse(recordId).success) return { ok: false, error: "Invalid record." };
    const d = delegate(resource);
    const existing = await d.findUnique({ where: { id: recordId } });
    if (!existing) return { ok: false, error: "This item no longer exists." };
    await d.delete({ where: { id: recordId } });
    await audit(user.id, "delete", resource.singular, recordId, String(existing[resource.titleField] ?? ""));
    refreshSite();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function reorderResource(key: string, ids: string[]): Promise<ActionResult> {
  try {
    const { resource, user } = await authorise(key);
    if (!resource.orderable) return { ok: false, error: "This collection cannot be reordered." };
    const parsed = z.array(idSchema).max(1000).safeParse(ids);
    if (!parsed.success) return { ok: false, error: "Invalid order." };
    const d = delegate(resource);
    await db.$transaction(
      parsed.data.map((id, index) => d.update({ where: { id }, data: { order: index } })),
    );
    await audit(user.id, "reorder", resource.label);
    refreshSite();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const TOGGLEABLE = new Set(["published", "visible", "featured", "pinned", "isOpen", "isAlumni"]);

export async function toggleField(key: string, recordId: string, field: string): Promise<ActionResult> {
  try {
    const { resource, user } = await authorise(key);
    const def = resource.fields.find((f) => f.name === field && f.type === "boolean");
    if (!def || !TOGGLEABLE.has(field) || !idSchema.safeParse(recordId).success) {
      return { ok: false, error: "Invalid request." };
    }
    const d = delegate(resource);
    const existing = await d.findUnique({ where: { id: recordId }, select: { [field]: true } });
    if (!existing) return { ok: false, error: "This item no longer exists." };
    await d.update({ where: { id: recordId }, data: { [field]: !existing[field] } });
    await audit(user.id, `toggle ${field}`, resource.singular, recordId);
    refreshSite();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function saveSettings(input: Record<string, unknown>): Promise<ActionResult> {
  try {
    const user = await assertUser("SUPER_ADMIN");
    const { values, errors } = validateFields(settingsFields, input);
    if (Object.keys(errors).length) {
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors };
    }
    const data = toPrismaData(settingsFields, values, "update");
    await db.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    await audit(user.id, "update", "Site Settings");
    refreshSite();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
