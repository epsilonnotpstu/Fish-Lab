import type { Metadata } from "next";
import { UserRoundCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/page-title";
import { ApprovalsList, type PendingApplication } from "@/components/admin/approvals-list";

export const metadata: Metadata = { title: "Member approvals" };

export default async function ApprovalsPage() {
  await requireUser();
  const members = await db.member.findMany({
    where: { status: { in: ["PENDING", "REJECTED"] } },
    orderBy: [{ status: "asc" }, { appliedAt: "desc" }],
    include: {
      category: { select: { name: true } },
      supervisor: { select: { name: true } },
      account: { select: { email: true, lastLoginAt: true } },
    },
  });

  const applications: PendingApplication[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.account?.email || m.email,
    photo: m.photo,
    status: m.status as "PENDING" | "REJECTED",
    appliedAt: m.appliedAt?.toISOString() ?? m.createdAt.toISOString(),
    reviewNote: m.reviewNote,
    group: m.category?.name ?? null,
    supervisor: m.supervisor?.name ?? null,
    details: [
      ["Program / role", m.program],
      ["Session", m.session],
      ["Semester", m.semester],
      ["Faculty", m.faculty],
      ["Department", m.department],
      ["Student / employee ID", m.studentId],
      ["Registration no.", m.registrationNo],
      ["Phone", m.phone],
      ["WhatsApp", m.whatsapp],
      ["Blood group", m.bloodGroup],
      ["Address", m.address],
      ["Emergency contact", m.emergencyContact],
      ["Research interests", m.researchInterests],
    ].filter(([, v]) => Boolean(v)) as [string, string][],
  }));

  return (
    <div>
      <PageTitle
        title="Member approvals"
        description="Requests from students and researchers who signed up on the website."
      />
      {applications.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border bg-card py-20 text-center">
          <UserRoundCheck className="size-10 text-muted-foreground" />
          <p className="mt-4 font-medium">No requests waiting</p>
          <p className="text-sm text-muted-foreground">New member sign-ups will appear here for review.</p>
        </div>
      ) : (
        <ApprovalsList applications={applications} />
      )}
    </div>
  );
}
