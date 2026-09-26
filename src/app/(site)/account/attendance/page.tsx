import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { isStaff, requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberAccess } from "@/lib/member-account";
import { getSettings } from "@/lib/settings";
import { hoursBetween, labDay, labTime } from "@/lib/geo";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/cards";
import { AttendancePanel } from "@/components/site/attendance-panel";

export const metadata: Metadata = { title: "Attendance", robots: { index: false } };

export default async function AttendancePage() {
  const user = await requireAccount();
  if (isStaff(user.role)) redirect("/admin/attendance");
  const access = await memberAccess(user.id);
  if (!access.approved) redirect("/account");

  const settings = await getSettings();
  const day = labDay();
  const [records, today] = await Promise.all([
    db.attendance.findMany({ where: { memberId: access.memberId! }, orderBy: { checkInAt: "desc" }, take: 60 }),
    db.attendance.findUnique({ where: { memberId_day: { memberId: access.memberId!, day } } }),
  ]);

  const thisMonth = records.filter((r) => r.day.startsWith(day.slice(0, 7)));
  const totalHours = thisMonth.reduce(
    (sum, r) => sum + (r.checkOutAt ? hoursBetween(r.checkInAt, r.checkOutAt) : 0),
    0,
  );

  return (
    <>
      <PageHeader
        compact
        eyebrow="Member portal"
        title="Attendance"
        subtitle="Mark that you are working in the laboratory today."
        crumbs={[{ label: "Member portal", href: "/account" }, { label: "Attendance" }]}
      />
      <section className="section pt-12">
        <div className="container-page grid max-w-5xl gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <AttendancePanel
              radius={settings.attendanceRadiusMeters}
              today={{
                checkedInAt: today ? labTime(today.checkInAt) : null,
                checkedOutAt: today?.checkOutAt ? labTime(today.checkOutAt) : null,
                distance: today?.distanceMeters ?? null,
                withinFence: today?.withinFence ?? true,
              }}
            />
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border bg-card p-5 text-center">
                <p className="font-heading text-3xl font-extrabold text-brand dark:text-brand-accent">{thisMonth.length}</p>
                <p className="text-xs text-muted-foreground">Days this month</p>
              </div>
              <div className="rounded-3xl border bg-card p-5 text-center">
                <p className="font-heading text-3xl font-extrabold text-brand dark:text-brand-accent">{totalHours}</p>
                <p className="text-xs text-muted-foreground">Hours logged</p>
              </div>
            </div>
            <Link href="/account" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
              <ArrowLeft className="size-4" /> Back to portal
            </Link>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold">Recent days</h2>
            {records.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No attendance yet" text="Your records will appear here." />
            ) : (
              <ul className="divide-y rounded-3xl border bg-card">
                {records.slice(0, 20).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="font-medium">{formatDate(new Date(`${r.day}T00:00:00`), "EEE, MMM d")}</span>
                    <span className="text-muted-foreground">
                      {labTime(r.checkInAt)}
                      {r.checkOutAt ? ` – ${labTime(r.checkOutAt)}` : " · open"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
