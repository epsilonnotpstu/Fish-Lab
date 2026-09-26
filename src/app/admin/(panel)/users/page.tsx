import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/page-title";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata: Metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const me = await requireUser("SUPER_ADMIN");
  const [users, members] = await Promise.all([
    db.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, lockedUntil: true,
        passwordHash: true, memberId: true, member: { select: { name: true } },
        _count: { select: { sessions: true } },
      },
    }),
    db.member.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageTitle title="Users & Roles" description="Super admins manage everything. Editors manage content. Members can only edit their own linked profile." />
      <UsersManager
        meId={me.id}
        members={members}
        users={users.map(({ passwordHash, ...u }) => ({
          ...u,
          hasPassword: Boolean(passwordHash),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          locked: Boolean(u.lockedUntil && u.lockedUntil > new Date()),
          lockedUntil: undefined,
          memberName: u.member?.name ?? null,
          sessions: u._count.sessions,
        }))}
      />
    </div>
  );
}
