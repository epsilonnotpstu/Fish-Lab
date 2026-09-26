import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { listNotices } from "@/lib/notices";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/cards";
import { NoticeCard } from "@/components/site/notice-card";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = { title: "Notices" };

export default async function NoticesPage() {
  const settings = await getSettings();
  if (!settings.showNotices) notFound();
  const notices = await listNotices("PUBLIC");

  return (
    <>
      <PageHeader
        eyebrow="Announcements"
        title="Notices"
        subtitle="Announcements from the Advanced Analytical Lab."
        crumbs={[{ label: "Notices" }]}
      />
      <section className="section pt-12">
        <div className="container-page max-w-4xl space-y-5">
          {notices.length === 0 ? (
            <EmptyState icon={Megaphone} title="No notices right now" text="New announcements will appear here." />
          ) : (
            notices.map((n, i) => (
              <Reveal key={n.id} delay={(i % 4) * 0.05}>
                <NoticeCard notice={n} />
              </Reveal>
            ))
          )}
        </div>
      </section>
    </>
  );
}
