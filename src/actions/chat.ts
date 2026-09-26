"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit, getCurrentUser, isStaff } from "@/lib/auth";
import { chatAccess, messageInclude, toChatDto, type ChatDto } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeRichText } from "@/lib/sanitize";

export type SendResult = { ok: boolean; error?: string; message?: ChatDto };

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i);
const safeUrl = z.string().max(2000).refine((v) => v === "" || /^https:\/\//i.test(v), "Invalid file");

const sendSchema = z.object({
  kind: z.enum(["TEXT", "IMAGE", "FILE", "AUDIO"]).default("TEXT"),
  body: z.string().max(4000).default(""),
  fileUrl: safeUrl.default(""),
  fileName: z.string().max(200).default(""),
  fileSize: z.number().int().min(0).max(100_000_000).default(0),
  mimeType: z.string().max(100).default(""),
  durationSec: z.number().int().min(0).max(36_000).default(0),
  width: z.number().int().min(0).max(20000).default(0),
  height: z.number().int().min(0).max(20000).default(0),
  replyToId: idSchema.nullable().optional(),
});

export async function sendMessage(input: unknown): Promise<SendResult> {
  const access = await chatAccess();
  if (!access) return { ok: false, error: "Only approved lab members can post in the group." };

  const parsed = sendSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, error: "That message could not be sent." };
  const data = parsed.data;

  const body = data.body.trim();
  if (data.kind === "TEXT" && !body) return { ok: false, error: "Write something first." };
  if (data.kind !== "TEXT" && !data.fileUrl) return { ok: false, error: "The attachment is missing." };

  if (!(await rateLimit(`chat:${access.userId}`, 60, 60 * 1000))) {
    return { ok: false, error: "You are sending messages too quickly. Wait a moment." };
  }
  if (data.replyToId && !(await db.chatMessage.findUnique({ where: { id: data.replyToId }, select: { id: true } }))) {
    return { ok: false, error: "The message you replied to no longer exists." };
  }

  const message = await db.chatMessage.create({
    data: {
      authorId: access.userId,
      kind: data.kind,
      // Plain text: strip any markup so nothing can be injected into the page.
      body: sanitizeRichText(body).replace(/<[^>]*>/g, ""),
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      durationSec: data.durationSec,
      width: data.width,
      height: data.height,
      replyToId: data.replyToId ?? null,
    },
    include: messageInclude,
  });

  return { ok: true, message: toChatDto(message) };
}

export async function deleteMessage(id: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You are not signed in." };
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };

  const message = await db.chatMessage.findUnique({ where: { id }, select: { authorId: true, deletedAt: true } });
  if (!message || message.deletedAt) return { ok: false, error: "This message is already gone." };
  // Members may delete their own messages; staff can moderate any message.
  if (message.authorId !== me.id && !isStaff(me.role)) return { ok: false, error: "You can only delete your own messages." };

  await db.chatMessage.update({ where: { id }, data: { deletedAt: new Date(), body: "", fileUrl: "", fileName: "" } });
  if (isStaff(me.role) && message.authorId !== me.id) await audit(me.id, "delete message", "Chat", id);
  return { ok: true };
}

export async function markChatSeen(): Promise<{ ok: boolean }> {
  const access = await chatAccess();
  if (!access) return { ok: false };
  await db.chatRead.upsert({
    where: { userId: access.userId },
    create: { userId: access.userId, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
  return { ok: true };
}
