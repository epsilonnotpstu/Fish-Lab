import "server-only";
import { cache } from "react";
import { db } from "./db";

export type LinkItem = { label: string; url: string };
export type SocialItem = { platform: string; url: string };

export const getSettings = cache(async () => {
  const existing = await db.siteSettings.findUnique({ where: { id: 1 } });
  return existing ?? (await db.siteSettings.create({ data: { id: 1 } }));
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asObject<T extends object>(value: unknown): Partial<T> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : {};
}

export const getNavigation = cache(async () => {
  return db.navItem.findMany({
    where: { visible: true, parentId: null },
    orderBy: { order: "asc" },
    include: { children: { where: { visible: true }, orderBy: { order: "asc" } } },
  });
});
