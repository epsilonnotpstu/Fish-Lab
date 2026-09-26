import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, isSafeHref } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { SmartImage } from "@/components/site/smart-image";

async function load(slug: string) {
  return db.event.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return e ? { title: e.title, description: e.summary } : {};
}

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const settings = await getSettings();
  const e = await load((await params).slug);
  if (!e || !settings.showEvents) notFound();
  const upcoming = (e.endDate ?? e.startDate) >= new Date();
  return (
    <>
      <PageHeader eyebrow={upcoming ? "Upcoming event" : "Past event"} title={e.title} subtitle={e.summary} image={e.coverImage} crumbs={[{ label: "Events", href: "/events" }, { label: e.title }]} />
      <section className="section pt-12">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {e.coverImage && (
              <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-[2rem]">
                <SmartImage src={e.coverImage} alt="" fill sizes="(min-width:1024px) 66vw, 100vw" className="object-cover" />
              </div>
            )}
            <RichText html={e.body || `<p>${e.summary}</p>`} className="prose-lg" />
            <Link href="/events" className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
              <ArrowLeft className="size-4" /> All events
            </Link>
          </div>
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-5 rounded-3xl border bg-card p-6 text-sm">
              <p className="flex gap-3"><CalendarDays className="size-5 shrink-0 text-brand-accent" />
                <span>{formatDate(e.startDate, "EEEE, MMMM d, yyyy")}{e.endDate && formatDate(e.endDate, "yyyy-MM-dd") !== formatDate(e.startDate, "yyyy-MM-dd") ? ` – ${formatDate(e.endDate, "MMMM d, yyyy")}` : ""}</span>
              </p>
              <p className="flex gap-3"><Clock className="size-5 shrink-0 text-brand-accent" />
                <span>{formatDate(e.startDate, "h:mm a")}{e.endDate ? ` – ${formatDate(e.endDate, "h:mm a")}` : ""}</span>
              </p>
              {e.location && <p className="flex gap-3"><MapPin className="size-5 shrink-0 text-brand-accent" /> {e.location}</p>}
              {upcoming && e.registrationUrl && isSafeHref(e.registrationUrl) && (
                <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">
                  <Ticket className="size-4" /> Register
                </a>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
