import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageTitle } from "@/components/admin/page-title";
import { AccountForms } from "@/components/admin/account-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  const [full, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, role: true, lastLoginAt: true, createdAt: true } }),
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="My account" description="Your profile, password and active sessions." />
      {user.mustChangePassword && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          <ShieldAlert className="size-5 shrink-0" />
          <p><strong>Please set a new password.</strong> For security, you must replace the temporary password before using the admin panel.</p>
        </div>
      )}
      <AccountForms name={full.name} email={full.email} />
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account. Changing your password signs out all other devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <span className="truncate text-muted-foreground">{s.userAgent || "Unknown device"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">since {formatDate(s.createdAt, "MMM d, HH:mm")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Role: {full.role === "SUPER_ADMIN" ? "Super admin" : "Editor"} · Last sign-in {formatDate(full.lastLoginAt, "MMM d, yyyy HH:mm")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
