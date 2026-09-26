import "server-only";
import type { ChatMessage, User } from "@prisma/client";
import { db } from "./db";
import { getCurrentUser, isStaff } from "./auth";
import { memberAccess } from "./member-account";

export type ChatAccess = {
  userId: string;
  name: string;
  staff: boolean;
};

/** The lab group is open to approved members and to staff. */
export async function chatAccess(): Promise<ChatAccess | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  if (isStaff(me.role)) return { userId: me.id, name: me.name, staff: true };
  const access = await memberAccess(me.id);
  if (!access.approved) return null;
  return { userId: me.id, name: me.name, staff: false };
}

export type ChatAuthor = { id: string; name: string; photo: string; staff: boolean };

export type ChatDto = {
  id: string;
  kind: ChatMessage["kind"];
  body: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSec: number;
  width: number;
  height: number;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  author: ChatAuthor | null;
  replyTo: { id: string; author: string; preview: string } | null;
};

type MessageWithRelations = ChatMessage & {
  author: (Pick<User, "id" | "name" | "role"> & { member: { photo: string } | null }) | null;
  replyTo: (Pick<ChatMessage, "id" | "body" | "kind"> & { author: Pick<User, "name"> | null }) | null;
};

export const messageInclude = {
  author: { select: { id: true, name: true, role: true, member: { select: { photo: true } } } },
  replyTo: { select: { id: true, body: true, kind: true, author: { select: { name: true } } } },
} as const;

function preview(kind: ChatMessage["kind"], body: string) {
  if (body.trim()) return body.slice(0, 120);
  return { IMAGE: "Photo", FILE: "File", AUDIO: "Voice message", TEXT: "", SYSTEM: "" }[kind] ?? "";
}

export function toChatDto(m: MessageWithRelations): ChatDto {
  const deleted = Boolean(m.deletedAt);
  return {
    id: m.id,
    kind: m.kind,
    body: deleted ? "" : m.body,
    fileUrl: deleted ? "" : m.fileUrl,
    fileName: deleted ? "" : m.fileName,
    fileSize: m.fileSize,
    mimeType: m.mimeType,
    durationSec: m.durationSec,
    width: m.width,
    height: m.height,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deleted,
    author: m.author
      ? {
          id: m.author.id,
          name: m.author.name,
          photo: m.author.member?.photo ?? "",
          staff: m.author.role !== "MEMBER",
        }
      : null,
    replyTo: m.replyTo
      ? { id: m.replyTo.id, author: m.replyTo.author?.name ?? "Someone", preview: preview(m.replyTo.kind, m.replyTo.body) }
      : null,
  };
}

export async function recentMessages(limit = 40, before?: string) {
  const cursor = before ? await db.chatMessage.findUnique({ where: { id: before }, select: { createdAt: true } }) : null;
  const rows = await db.chatMessage.findMany({
    where: cursor ? { createdAt: { lt: cursor.createdAt } } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    include: messageInclude,
  });
  return rows.reverse().map(toChatDto);
}

export async function messagesAfter(isoDate: string, limit = 50) {
  const after = new Date(isoDate);
  if (Number.isNaN(after.getTime())) return [];
  const rows = await db.chatMessage.findMany({
    where: { createdAt: { gt: after } },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: messageInclude,
  });
  return rows.map(toChatDto);
}

/** Messages changed (edited or deleted) since a timestamp, so clients can refresh them. */
export async function messagesTouchedSince(isoDate: string) {
  const since = new Date(isoDate);
  if (Number.isNaN(since.getTime())) return [];
  const rows = await db.chatMessage.findMany({
    where: { OR: [{ editedAt: { gt: since } }, { deletedAt: { gt: since } }] },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: messageInclude,
  });
  return rows.map(toChatDto);
}
