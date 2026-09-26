import { getCurrentUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { hoursBetween, labDay, labTime } from "@/lib/geo";

/** Monthly attendance export for the admin panel. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Unauthorized", { status: 401 });

  const monthParam = new URL(request.url).searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : labDay().slice(0, 7);

  const records = await db.attendance.findMany({
    where: { day: { startsWith: month } },
    orderBy: [{ day: "asc" }, { checkInAt: "asc" }],
    include: { member: { select: { name: true, studentId: true, program: true, session: true } } },
  });

  const cell = (v: string | number | null) => {
    const s = String(v ?? "");
    // Prefix formula-like values so spreadsheets treat them as text.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [
    ["Date", "Name", "Student ID", "Program", "Session", "Check in", "Check out", "Hours", "Distance (m)", "Within lab", "Source", "Note"],
    ...records.map((r) => [
      r.day,
      r.member.name,
      r.member.studentId,
      r.member.program,
      r.member.session,
      labTime(r.checkInAt),
      r.checkOutAt ? labTime(r.checkOutAt) : "",
      r.checkOutAt ? hoursBetween(r.checkInAt, r.checkOutAt) : "",
      r.distanceMeters ?? "",
      r.withinFence ? "yes" : "no",
      r.source,
      r.note,
    ]),
  ];

  return new Response(rows.map((r) => r.map(cell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
