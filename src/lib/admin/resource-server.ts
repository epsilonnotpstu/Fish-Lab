import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitize";
import { getResource, type Field, type Resource, type SubField } from "./resources";

// Prisma delegates share an API shape; index them by model name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Delegate = any;
export function delegate(resource: Resource): Delegate {
  return (db as unknown as Record<string, Delegate>)[resource.model];
}

export const PAGE_SIZE = 20;

// ─── Validation ──────────────────────────────────────────────────────────────

const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v), {
    message: "Must be an http(s) URL or a site path starting with /",
  });

const linkHref = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(v), {
    message: "Must start with https://, /, #, mailto: or tel:",
  });

const id = z.string().regex(/^[a-z0-9]{10,40}$/i, "Invalid reference");

function subfieldSchema(sub: SubField) {
  switch (sub.type) {
    case "url":
      return linkHref;
    case "image":
      return safeUrl;
    case "textarea":
      return z.string().trim().max(5000);
    default:
      return z.string().trim().max(500);
  }
}

function fieldSchema(field: Field): z.ZodType {
  switch (field.type) {
    case "text":
      return z.string().trim().max(field.max ?? 500);
    case "textarea":
      return z.string().trim().max(field.max ?? 10000);
    case "richtext":
      return z.string().max(200_000);
    case "slug":
      return z
        .string()
        .trim()
        .max(100)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only")
        .or(z.literal(""));
    case "email":
      return z.email("Invalid email address").max(254).or(z.literal(""));
    case "url":
      return linkHref;
    case "image":
    case "file":
      return safeUrl;
    case "color":
      return z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #0b3b5c");
    case "number":
      return z
        .union([z.number(), z.string()])
        .transform((v) => (v === "" || v === null ? null : Number(v)))
        .refine((v) => v === null || (Number.isInteger(v) && Math.abs(v) < 1e9), "Must be a whole number")
        .nullable();
    case "boolean":
      return z.boolean();
    case "date":
    case "datetime":
      return z
        .string()
        .max(40)
        .transform((v) => (v ? new Date(v) : null))
        .refine((v) => v === null || !Number.isNaN(v.getTime()), "Invalid date")
        .nullable();
    case "select":
      return z.enum((field.options ?? []) as [string, ...string[]]).or(z.literal(""));
    case "relation":
      return id.or(z.literal("")).nullable();
    case "relations":
      return z.array(id).max(500);
    case "gallery":
      return z.array(safeUrl).max(100);
    case "tags":
      return z.array(z.string().trim().max(300)).max(100);
    case "repeater": {
      const shape: Record<string, z.ZodType> = {};
      for (const sub of field.subfields ?? []) shape[sub.name] = subfieldSchema(sub).default("");
      return z.array(z.object(shape)).max(300);
    }
  }
}

function isEmpty(v: unknown) {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

export type FieldErrors = Record<string, string>;

export function validateFields(fields: Field[], input: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  const errors: FieldErrors = {};

  for (const field of fields) {
    const raw = input[field.name];
    // Hidden conditional fields are not required.
    const active =
      !field.showIf || field.showIf.values.includes(String(input[field.showIf.field] ?? ""));

    if (raw === undefined) {
      if (field.required && active) errors[field.name] = `${field.label} is required`;
      continue;
    }
    const parsed = fieldSchema(field).safeParse(raw);
    if (!parsed.success) {
      errors[field.name] = parsed.error.issues[0]?.message ?? "Invalid value";
      continue;
    }
    if (field.required && active && isEmpty(parsed.data)) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }
    values[field.name] =
      field.type === "richtext" ? sanitizeRichText(parsed.data as string) : parsed.data;
  }
  return { values, errors };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

/** Turn validated form values into a Prisma create/update payload. */
export function toPrismaData(
  fields: Field[],
  values: Record<string, unknown>,
  mode: "create" | "update",
  existingContent: Record<string, unknown> = {},
) {
  const data: Record<string, unknown> = {};
  let content: Record<string, unknown> | null = null;

  for (const field of fields) {
    if (!(field.name in values)) continue;
    const value = values[field.name];

    if (field.name.startsWith("content.")) {
      content ??= { ...existingContent };
      content[field.name.slice("content.".length)] = value;
      continue;
    }

    switch (field.type) {
      case "relation":
        if (value) data[field.name] = { connect: { id: value } };
        else if (mode === "update") data[field.name] = { disconnect: true };
        break;
      case "relations": {
        const ids = (value as string[]).map((v) => ({ id: v }));
        data[field.name] = mode === "create" ? { connect: ids } : { set: ids };
        break;
      }
      case "repeater":
        if (field.nested) {
          const rows = (value as Record<string, string>[])
            .filter((r) => Object.values(r).some(Boolean))
            .map((r, i) => ({ ...r, order: i }));
          data[field.name] =
            mode === "create" ? { create: rows } : { deleteMany: {}, create: rows };
        } else {
          data[field.name] = (value as Record<string, string>[]).filter((r) =>
            Object.values(r).some(Boolean),
          );
        }
        break;
      case "tags":
        data[field.name] = (value as string[]).filter(Boolean);
        break;
      case "select":
        if (value !== "") data[field.name] = value;
        break;
      default:
        data[field.name] = value;
    }
  }
  if (content) data.content = content;
  return data;
}

export function friendlyDbError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return "That URL slug (or unique value) is already in use.";
    if (err.code === "P2025") return "This item no longer exists.";
    if (err.code === "P2003") return "This item is still referenced by other content.";
  }
  console.error(err);
  return "Something went wrong while saving. Please try again.";
}

// ─── Reading ─────────────────────────────────────────────────────────────────

function relationTitleSelect(targetKey: string | undefined) {
  const target = targetKey ? getResource(targetKey) : undefined;
  return { select: { id: true, [target?.titleField ?? "id"]: true } };
}

export async function listRecords(resource: Resource, opts: { q?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim().slice(0, 100);
  const where = q
    ? {
        OR: resource.searchFields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })),
      }
    : {};

  const include: Record<string, unknown> = {};
  for (const col of resource.columns) {
    if (col.type === "relation") {
      const field = resource.fields.find((f) => f.name === col.name);
      include[col.name] = relationTitleSelect(field?.relation);
    }
  }

  const d = delegate(resource);
  const [rows, total] = await Promise.all([
    d.findMany({
      where,
      orderBy: resource.orderBy,
      include: Object.keys(include).length ? include : undefined,
      // Orderable collections are small and reordered as a whole.
      skip: resource.orderable ? undefined : (page - 1) * PAGE_SIZE,
      take: resource.orderable ? undefined : PAGE_SIZE,
    }),
    d.count({ where }),
  ]);
  return { rows: rows as Record<string, unknown>[], total, page, pageSize: PAGE_SIZE };
}

export async function getRecord(resource: Resource, recordId: string) {
  const include: Record<string, unknown> = {};
  for (const f of resource.fields) {
    if (f.type === "relations") include[f.name] = { select: { id: true } };
    if (f.type === "repeater" && f.nested) include[f.name] = { orderBy: { order: "asc" } };
  }
  return delegate(resource).findUnique({
    where: { id: recordId },
    include: Object.keys(include).length ? include : undefined,
  }) as Promise<Record<string, unknown> | null>;
}

function toDateInput(v: unknown, withTime: boolean) {
  if (!(v instanceof Date)) return "";
  const iso = new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString();
  return withTime ? iso.slice(0, 16) : iso.slice(0, 10);
}

/** Convert a DB row into plain JSON values for the client form. */
export function toFormValues(fields: Field[], record: Record<string, unknown> | null) {
  const out: Record<string, unknown> = {};
  const content = (record?.content ?? {}) as Record<string, unknown>;

  for (const f of fields) {
    const raw = f.name.startsWith("content.")
      ? content[f.name.slice(8)]
      : f.type === "relation"
        ? record?.[`${f.name}Id`]
        : record?.[f.name];

    switch (f.type) {
      case "boolean":
        out[f.name] = record ? Boolean(raw) : f.name === "published" || f.name === "visible" || f.name === "isOpen";
        break;
      case "number":
        out[f.name] = raw ?? "";
        break;
      case "date":
      case "datetime":
        out[f.name] = toDateInput(raw, f.type === "datetime");
        if (!record && f.required) out[f.name] = toDateInput(new Date(), f.type === "datetime");
        break;
      case "relations":
        out[f.name] = Array.isArray(raw) ? raw.map((r: { id: string }) => r.id) : [];
        break;
      case "repeater":
        out[f.name] = Array.isArray(raw)
          ? raw.map((row: Record<string, unknown>) =>
              Object.fromEntries((f.subfields ?? []).map((s) => [s.name, String(row?.[s.name] ?? "")])),
            )
          : [];
        break;
      case "gallery":
      case "tags":
        out[f.name] = Array.isArray(raw) ? raw.map(String) : [];
        break;
      case "color":
        out[f.name] = typeof raw === "string" && raw ? raw : "#14b8a6";
        break;
      default:
        out[f.name] = raw ?? (f.type === "select" && !record ? (f.options?.[0] ?? "") : "");
    }
  }
  return out;
}

export type RelationOptions = Record<string, { value: string; label: string }[]>;

export async function relationOptions(fields: Field[]): Promise<RelationOptions> {
  const out: RelationOptions = {};
  for (const f of fields) {
    if ((f.type !== "relation" && f.type !== "relations") || !f.relation) continue;
    const target = getResource(f.relation);
    if (!target) continue;
    const rows = (await delegate(target).findMany({
      select: { id: true, [target.titleField]: true },
      orderBy: target.orderBy,
      take: 1000,
    })) as Record<string, string>[];
    out[f.name] = rows.map((r) => ({ value: r.id, label: r[target.titleField] }));
  }
  return out;
}
