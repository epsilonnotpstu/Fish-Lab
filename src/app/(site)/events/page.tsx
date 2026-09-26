import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/cards";
import { EventCard } from "@/components/site/event-card";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const settings = await getSettings();
  if (!settings.showEvents) notFound();
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.event.findMany({ where: { published: true, OR: [{ startDate: { gte: now } }, { endDate: { gte: now } }] }, orderBy: { startDate: "asc" } }),
    db.event.findMany({ where: { published: true, startDate: { lt: now }, OR: [{ endDate: null }, { endDate: { lt: now } }] }, orderBy: { startDate: "desc" }, take: 30 }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Calendar" title="Events & seminars" subtitle="Seminars, workshops, open days and field trips." crumbs={[{ label: "Events" }]} />
      <section className="section pt-12">
        <div className="container-page max-w-5xl space-y-16">
          <div>
            <h2 className="mb-6 text-2xl font-bold">Upcoming</h2>
            {upcoming.length ? (
              <div className="space-y-4">{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</div>
            ) : (
              <EmptyState icon={CalendarDays} title="No upcoming events" text="Check back soon for seminars and workshops." />
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="mb-6 text-2xl font-bold">Past events</h2>
              <div className="space-y-4">{past.map((e) => <EventCard key={e.id} event={e} past />)}</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
