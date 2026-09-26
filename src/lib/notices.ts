import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Notices that are live right now, for the given audience. */
export function noticeWhere(audience: "PUBLIC" | "ALL"): Prisma.NoticeWhereInput {
  const now = new Date();
  return {
    published: true,
    publishAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    ...(audience === "PUBLIC" ? { audience: "PUBLIC" as const } : {}),
  };
}

export function listNotices(audience: "PUBLIC" | "ALL", take?: number) {
  return db.notice.findMany({
    where: noticeWhere(audience),
    orderBy: [{ pinned: "desc" }, { publishAt: "desc" }],
    take,
  });
}
