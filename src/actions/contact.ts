"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { getSettings } from "@/lib/settings";
import { notifyNewMessage } from "@/lib/mail";

export type ContactState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.email("Please enter a valid email address.").max(254),
  subject: z.string().trim().max(200).default(""),
  type: z.string().trim().max(100).default(""),
  message: z.string().trim().min(10, "Message is too short.").max(5000, "Message is too long."),
});

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const settings = await getSettings();
  if (!settings.contactFormEnabled) return { error: "The contact form is currently closed." };

  // Honeypot: real users never see or fill this field.
  if (String(formData.get("website") ?? "") !== "") return { ok: true };
  // Bots tend to submit instantly; humans take a few seconds.
  const startedAt = Number(formData.get("t") ?? 0);
  if (!startedAt || Date.now() - startedAt < 3000) return { ok: true };

  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    subject: formData.get("subject") ?? "",
    type: formData.get("type") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const ipHash = await clientIpHash();
  if (!(await rateLimit(`contact:${ipHash}`, 5, 60 * 60 * 1000))) {
    return { error: "You have sent several messages recently. Please try again later." };
  }

  const allowedTypes = Array.isArray(settings.inquiryTypes) ? (settings.inquiryTypes as string[]) : [];
  const type = allowedTypes.includes(parsed.data.type) ? parsed.data.type : "";

  const message = await db.contactMessage.create({ data: { ...parsed.data, type, ipHash } });
  await notifyNewMessage(settings, message).catch((err) => console.error("mail failed", err));
  return { ok: true };
}
