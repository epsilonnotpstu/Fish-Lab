"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUser, audit, AuthError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { sendMail, mailConfigured } from "@/lib/mail";
import type { ActionResult } from "./resources";

const idSchema = z.string().regex(/^[a-z0-9]{10,40}$/i);

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function notifyMember(memberId: string, subject: string, intro: string, note = "") {
  if (!mailConfigured()) return;
  const [settings, member] = await Promise.all([
    getSettings(),
    db.member.findUnique({ where: { id: memberId }, select: { name: true, email: true, account: { select: { email: true } } } }),
  ]);
  const to = member?.account?.email || member?.email;
  if (!to) return;
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  await sendMail({
    to,
    subject,
    html: `<p>Dear ${escape(member?.name ?? "member")},</p><p>${escape(intro)}</p>${
      note ? `<p><strong>Note from the lab:</strong> ${escape(note)}</p>` : ""
    }<p><a href="${site}/account">Open the member portal</a></p><p>— ${escape(settings.labName)}</p>`,
  }).catch((e) => console.error("member mail failed", e));
}

export async function approveMember(id: string): Promise<ActionResult> {
  try {
    const me = await assertUser();
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };
    const member = await db.member.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
    if (!member) return { ok: false, error: "This application no longer exists." };

    await db.member.update({
      where: { id },
      data: { status: "APPROVED", published: true, approvedAt: new Date(), approvedById: me.id, reviewNote: "" },
    });
    await audit(me.id, "approve member", "Member", id, member.name);
    await notifyMember(id, "Your lab membership has been approved", "Your membership of the lab has been approved. You can now sign in and use the member portal.");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function rejectMember(id: string, note: string): Promise<ActionResult> {
  try {
    const me = await assertUser();
    const parsed = z.object({ id: idSchema, note: z.string().trim().max(500) }).safeParse({ id, note });
    if (!parsed.success) return { ok: false, error: "Invalid request." };
    const member = await db.member.findUnique({ where: { id }, select: { name: true } });
    if (!member) return { ok: false, error: "This application no longer exists." };

    await db.member.update({
      where: { id },
      data: { status: "REJECTED", published: false, reviewNote: parsed.data.note, approvedById: me.id, approvedAt: null },
    });
    await audit(me.id, "reject member", "Member", id, member.name);
    await notifyMember(
      id,
      "About your lab membership request",
      "Your membership request was not approved at this time. You can update your details in the member portal and ask the lab to review it again.",
      parsed.data.note,
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Put an approved member back into review (e.g. after they leave the lab). */
export async function suspendMember(id: string): Promise<ActionResult> {
  try {
    const me = await assertUser("SUPER_ADMIN");
    if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid request." };
    await db.member.update({ where: { id }, data: { status: "PENDING", published: false } });
    await audit(me.id, "suspend member", "Member", id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
