import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { resources } from "@/lib/admin/resources";
import { LabLogo } from "@/components/site/lab-logo";
import { SidebarNav, type NavGroup } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (user.mustChangePassword && !pathname.startsWith("/admin/account")) redirect("/admin/account?first=1");
  const [settings, unread, pending] = await Promise.all([
    getSettings(),
    db.contactMessage.count({ where: { read: false } }),
    db.member.count({ where: { status: "PENDING" } }),
  ]);
  const superAdmin = user.role === "SUPER_ADMIN";

  const byGroup = (g: string) =>
    resources
      .filter((r) => r.group === g && (!r.superAdminOnly || superAdmin))
      .map((r) => ({ href: `/admin/${r.key}`, label: r.label, icon: r.icon }));

  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
        { href: "/admin/messages", label: "Messages", icon: "Inbox", badge: unread },
        { href: "/admin/approvals", label: "Approvals", icon: "UserRoundCheck", badge: pending },
        { href: "/admin/chat", label: "Lab group", icon: "MessagesSquare" },
        { href: "/admin/attendance", label: "Attendance", icon: "CalendarCheck" },
        { href: "/admin/inauguration", label: "Inauguration", icon: "PartyPopper" },
      ],
    },
    { label: "Content", items: byGroup("Content") },
    { label: "People", items: byGroup("People") },
    {
      label: "Website",
      items: [
        ...byGroup("Site"),
        ...(superAdmin ? [{ href: "/admin/settings", label: "Site Settings", icon: "Settings" }] : []),
      ],
    },
    ...(superAdmin
      ? [{ label: "Administration", items: [
          { href: "/admin/users", label: "Users & Roles", icon: "UserCog" },
          { href: "/admin/activity", label: "Activity Log", icon: "Activity" },
        ] }]
      : []),
  ];

  const brand = (
    <Link href="/admin" className="text-white [&_.text-foreground]:text-white">
      <LabLogo brand={settings} light />
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">{brand}</div>
        <SidebarNav groups={groups} />
        <div className="border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/40">Lab CMS · v1.0</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar user={user} groups={groups} brandSlot={brand} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
