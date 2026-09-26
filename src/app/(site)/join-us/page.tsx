import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, ExternalLink, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, isSafeHref } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { EmptyState } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = { title: "Join Us" };

export default async function JoinUsPage() {
  const settings = await getSettings();
  if (!settings.showJoinUs) notFound();
  const items = await db.opportunity.findMany({ where: { published: true }, orderBy: [{ isOpen: "desc" }, { order: "asc" }] });
  return (
    <>
      <PageHeader
        eyebrow="Careers & admissions"
        title="Join our lab"
        subtitle="We are always looking for curious, motivated people who want to make aquatic food systems more sustainable."
        crumbs={[{ label: "Join Us" }]}
      />
      <section className="section pt-12">
        <div className="container-page max-w-5xl space-y-6">
          {items.length === 0 && <EmptyState icon={Sparkles} title="No open positions right now" text="You are still welcome to contact us about future opportunities." />}
          {items.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.05}>
              <article id={o.slug} className="scroll-mt-28 rounded-3xl border bg-card p-6 sm:p-10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{o.type}</span>
                  <span className={o.isOpen ? "inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400" : "text-xs font-semibold text-muted-foreground"}>
                    <span className={o.isOpen ? "size-2 animate-pulse rounded-full bg-emerald-500" : "size-2 rounded-full bg-muted-foreground"} />
                    {o.isOpen ? "Open" : "Closed"}
                  </span>
                  {o.deadline && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5" /> Deadline {formatDate(o.deadline, "MMMM d, yyyy")}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-2xl font-bold">{o.title}</h2>
                {o.summary && <p className="mt-3 text-lg text-muted-foreground">{o.summary}</p>}
                <RichText html={o.body} className="mt-6" />
                <div className="mt-8 flex flex-wrap gap-3">
                  {o.applyUrl && isSafeHref(o.applyUrl) && o.isOpen && (
                    <a href={o.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
                      Apply now <ExternalLink className="size-4" />
                    </a>
                  )}
                  <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition hover:bg-muted">
                    Ask a question <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
