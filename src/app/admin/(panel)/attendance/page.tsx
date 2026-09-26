import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Download, MapPin, TriangleAlert, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hoursBetween, labDay, labTime } from "@/lib/geo";
import { formatDate } from "@/lib/format";
import { param } from "@/lib/params";
import { PageTitle } from "@/components/admin/page-title";
import { AttendanceRow } from "@/components/admin/attendance-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Attendance" };

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(param(sp, "day", 10)) ? param(sp, "day", 10) : labDay();
  const month = day.slice(0, 7);

  const [records, monthRecords, activeMembers] = await Promise.all([
    db.attendance.findMany({
      where: { day },
      orderBy: { checkInAt: "asc" },
      include: { member: { select: { id: true, name: true, photo: true, program: true, category: { select: { name: true } } } } },
    }),
    db.attendance.findMany({
      where: { day: { startsWith: month } },
      include: { member: { select: { id: true, name: true } } },
    }),
    db.member.count({ where: { status: "APPROVED", published: true, isAlumni: false } }),
  ]);

  const inLab = records.filter((r) => !r.checkOutAt);
  const perMember = new Map<string, { name: string; days: number; hours: number }>();
  for (const r of monthRecords) {
    const cur = perMember.get(r.member.id) ?? { name: r.member.name, days: 0, hours: 0 };
    cur.days += 1;
    cur.hours += r.checkOutAt ? hoursBetween(r.checkInAt, r.checkOutAt) : 0;
    perMember.set(r.member.id, cur);
  }
  const summary = [...perMember.values()].sort((a, b) => b.days - a.days);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Attendance"
        description="Who is in the laboratory, day by day."
        actions={
          <>
            <form className="flex items-center gap-2">
              <Input type="date" name="day" defaultValue={day} className="h-9 w-auto" />
              <Button type="submit" variant="outline" size="sm">Show day</Button>
            </form>
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/admin/attendance.csv?month=${month}`}><Download /> CSV ({month})</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "In the lab now", value: inLab.length, icon: MapPin },
          { label: `Present on ${formatDate(new Date(`${day}T00:00:00`), "MMM d")}`, value: records.length, icon: CalendarCheck },
          { label: "Active members", value: activeMembers, icon: Users },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"><s.icon className="size-5" /></span>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Register · {formatDate(new Date(`${day}T00:00:00`), "EEEE, MMMM d, yyyy")}</h2>
          <span className="text-sm text-muted-foreground">{records.length} records</span>
        </div>
        {records.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nobody marked attendance on this day.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Check in</th>
                  <th className="px-4 py-2.5 font-medium">Check out</th>
                  <th className="px-4 py-2.5 font-medium">Hours</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <AttendanceRow
                    key={r.id}
                    record={{
                      id: r.id,
                      name: r.member.name,
                      photo: r.member.photo,
                      group: r.member.category?.name ?? r.member.program ?? "",
                      checkIn: labTime(r.checkInAt),
                      checkOut: r.checkOutAt ? labTime(r.checkOutAt) : null,
                      hours: r.checkOutAt ? hoursBetween(r.checkInAt, r.checkOutAt) : null,
                      distance: r.distanceMeters,
                      withinFence: r.withinFence,
                      note: r.note,
                      source: r.source,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Monthly summary · {month}</h2>
          {summary.some((s) => s.hours === 0) && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <TriangleAlert className="size-3.5" /> hours only count days with a check-out
            </span>
          )}
        </div>
        {summary.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No attendance recorded this month.</p>
        ) : (
          <ul className="divide-y">
            {summary.map((s) => (
              <li key={s.name} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <Badge variant="secondary">{s.days} days</Badge>
                  <span>{s.hours} h</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
