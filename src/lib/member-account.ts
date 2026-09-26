import "server-only";
import type { Member, User } from "@prisma/client";
import { db } from "./db";
import { slugify } from "./format";
import { applicationFields } from "./member-fields";
import { toPrismaData, validateFields, type FieldErrors } from "./admin/resource-server";

/** Which member group a new application lands in, based on the chosen program. */
const CATEGORY_BY_PROGRAM: Record<string, string> = {
  "BSc (Fisheries)": "bsc-students",
  MS: "ms-students",
  PhD: "ms-students",
  "Research Assistant": "research-assistants",
  "Lab Staff": "research-assistants",
  Faculty: "project-team",
  Intern: "research-assistants",
  "Visiting Researcher": "collaborators",
};

export async function uniqueMemberSlug(name: string) {
  const base = slugify(name) || "member";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await db.member.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type ApplicationResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; fieldErrors: FieldErrors };

/** Validate the academic/contact/profile part of a sign-up application. */
export function validateApplication(input: Record<string, unknown>): ApplicationResult {
  const { values, errors } = validateFields(applicationFields, input ?? {});
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, values };
}

/** Create the pending member profile that an approver will review. */
export async function createPendingMember(
  user: Pick<User, "id" | "name" | "email">,
  values: Record<string, unknown>,
): Promise<Member> {
  const data = toPrismaData(applicationFields, values, "create") as Record<string, unknown>;
  const program = String(values.program ?? "");
  const categorySlug = CATEGORY_BY_PROGRAM[program];
  const category = categorySlug
    ? await db.memberCategory.findUnique({ where: { slug: categorySlug }, select: { id: true } })
    : null;

  const member = await db.member.create({
    data: {
      ...data,
      name: user.name,
      email: user.email,
      slug: await uniqueMemberSlug(user.name),
      position: program,
      status: "PENDING",
      published: false,
      appliedAt: new Date(),
      categoryId: category?.id ?? null,
    } as never,
  });

  await db.user.update({ where: { id: user.id }, data: { memberId: member.id } });
  return member;
}

/** The member area is only usable once an administrator has approved. */
export async function memberAccess(userId: string) {
  const account = await db.user.findUnique({
    where: { id: userId },
    select: { active: true, member: { select: { id: true, status: true, reviewNote: true } } },
  });
  return {
    active: Boolean(account?.active),
    memberId: account?.member?.id ?? null,
    status: account?.member?.status ?? null,
    reviewNote: account?.member?.reviewNote ?? "",
    approved: account?.active === true && account.member?.status === "APPROVED",
  };
}
