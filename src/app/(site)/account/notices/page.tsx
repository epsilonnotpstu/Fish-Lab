import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { isStaff, requireAccount } from "@/lib/auth";
import { memberAccess } from "@/lib/member-account";
import { listNotices } from "@/lib/notices";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/cards";
import { NoticeCard } from "@/components/site/notice-card";

export const metadata: Metadata = { title: "Lab notices", robots: { index: false } };

export default async function MemberNoticesPage() {
  const user = await requireAccount();
  if (isStaff(user.role)) redirect("/admin/notices");
  const access = await memberAccess(user.id);
  if (!access.approved) redirect("/account");

  const notices = await listNotices("ALL");

  return (
    <>
      <PageHeader
        compact
        eyebrow="Member portal"
        title="Lab notices"
        subtitle="Announcements from the lab, including members-only notices."
        crumbs={[{ label: "Member portal", href: "/account" }, { label: "Notices" }]}
      />
      <section className="section pt-12">
        <div className="container-page max-w-4xl space-y-5">
          {notices.length === 0 ? (
            <EmptyState icon={Megaphone} title="No notices yet" />
          ) : (
            notices.map((n) => <NoticeCard key={n.id} notice={n} />)
          )}
          <Link href="/account" className="inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
            <ArrowLeft className="size-4" /> Back to portal
          </Link>
        </div>
      </section>
    </>
  );
}
