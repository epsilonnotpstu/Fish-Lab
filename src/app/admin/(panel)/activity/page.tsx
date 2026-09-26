import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { pageParam } from "@/lib/params";
import { PageTitle } from "@/components/admin/page-title";
import { Pagination } from "@/components/site/pagination";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Activity log" };
const PER_PAGE = 50;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("SUPER_ADMIN");
  const page = pageParam(await searchParams);
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { name: true, email: true } } } }),
    db.auditLog.count(),
  ]);
  return (
    <div>
      <PageTitle title="Activity log" description="Every sign-in and change made in the admin panel." />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Item</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(l.createdAt, "MMM d, yyyy HH:mm")}</td>
                <td className="px-4 py-2.5">{l.user?.name ?? <span className="text-muted-foreground">Deleted user</span>}</td>
                <td className="px-4 py-2.5"><Badge variant="secondary" className="capitalize">{l.action}</Badge></td>
                <td className="px-4 py-2.5 text-muted-foreground">{l.entity}{l.summary ? ` — ${l.summary}` : ""}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} hrefFor={(p) => `/admin/activity?page=${p}`} />
    </div>
  );
}
