import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState, PublicationItem } from "@/components/site/cards";
import { CiteButton } from "@/components/site/cite-button";
import { param, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Publications" };

export default async function PublicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const settings = await getSettings();
  if (!settings.showPublications) notFound();
  const sp = await searchParams;
  const q = param(sp, "q", 100).trim();
  const type = param(sp, "type", 40);
  const area = param(sp, "area", 80);
  const year = Number(param(sp, "year", 4)) || undefined;

  const where: Prisma.PublicationWhereInput = {
    published: true,
    ...(type ? { type } : {}),
    ...(year ? { year } : {}),
    ...(area ? { researchAreas: { some: { slug: area } } } : {}),
    ...(q
      ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { authors: { contains: q, mode: "insensitive" } }, { venue: { contains: q, mode: "insensitive" } }] }
      : {}),
  };

  const [pubs, all, areas] = await Promise.all([
    db.publication.findMany({ where, orderBy: [{ year: "desc" }, { title: "asc" }] }),
    db.publication.findMany({ where: { published: true }, select: { year: true, type: true } }),
    db.researchArea.findMany({ where: { published: true }, orderBy: { order: "asc" }, select: { slug: true, title: true } }),
  ]);
  const years = [...new Set(all.map((p) => p.year))].sort((a, b) => b - a);
  const types = [...new Set(all.map((p) => p.type))].sort();
  const byYear = pubs.reduce<Record<number, typeof pubs>>((acc, p) => ((acc[p.year] ??= []).push(p), acc), {});
  const filtered = Boolean(q || type || area || year);

  return (
    <>
      <PageHeader
        eyebrow="Research output"
        title="Publications"
        subtitle={`${all.length} peer-reviewed articles, conference papers, books and more.`}
        crumbs={[{ label: "Publications" }]}
      />
      <section className="section pt-12">
        <div className="container-page">
          <form action="/publications" className="mb-12 grid gap-3 rounded-3xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input name="q" defaultValue={q} placeholder="Search title, author, journal…" className="h-11 w-full rounded-full border bg-background pr-4 pl-10 text-sm" />
            </div>
            <select name="year" defaultValue={year ?? ""} className="h-11 rounded-full border bg-background px-4 text-sm" aria-label="Year">
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select name="type" defaultValue={type} className="h-11 rounded-full border bg-background px-4 text-sm" aria-label="Type">
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="area" defaultValue={area} className="h-11 rounded-full border bg-background px-4 text-sm" aria-label="Research area">
              <option value="">All research areas</option>
              {areas.map((a) => <option key={a.slug} value={a.slug}>{a.title}</option>)}
            </select>
            <div className="flex gap-2">
              <button className="h-11 flex-1 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Filter</button>
              {filtered && <Link href="/publications" className="grid h-11 place-items-center rounded-full border px-4 text-sm">Reset</Link>}
            </div>
          </form>

          {pubs.length === 0 ? (
            <EmptyState icon={BookOpen} title="No publications found" text="Try adjusting your filters." />
          ) : (
            <div className="space-y-16">
              {Object.keys(byYear)
                .map(Number)
                .sort((a, b) => b - a)
                .map((y) => (
                  <div key={y} className="grid gap-6 lg:grid-cols-[140px_1fr]">
                    <div>
                      <h2 className="sticky top-28 font-heading text-4xl font-extrabold text-brand/20 dark:text-brand-accent/30">{y}</h2>
                    </div>
                    <div className="space-y-4">
                      {byYear[y].map((p) => (
                        <div key={p.id} className="relative">
                          <PublicationItem pub={p} showAbstract />
                          <CiteButton pub={{ title: p.title, authors: p.authors, venue: p.venue, year: p.year, volume: p.volume, pages: p.pages, doi: p.doi, type: p.type }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
