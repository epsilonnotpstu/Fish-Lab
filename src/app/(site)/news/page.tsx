import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState, NewsRow } from "@/components/site/cards";
import { Pagination } from "@/components/site/pagination";
import { buildQuery, pageParam, param, type SearchParams } from "@/lib/params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News" };
const PER_PAGE = 10;

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = param(sp, "category", 60);
  const q = param(sp, "q", 80).trim();
  const year = Number(param(sp, "year", 4)) || undefined;
  const page = pageParam(sp);

  const where: Prisma.NewsPostWhereInput = {
    published: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }] } : {}),
    ...(year ? { date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } : {}),
  };

  const [categories, posts, total, dates] = await Promise.all([
    db.newsCategory.findMany({ orderBy: { order: "asc" } }),
    db.newsPost.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { date: "desc" }],
      include: { category: true },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.newsPost.count({ where }),
    db.newsPost.findMany({ where: { published: true }, select: { date: true } }),
  ]);
  const years = [...new Set(dates.map((d) => d.date.getFullYear()))].sort((a, b) => b - a);
  const pages = Math.ceil(total / PER_PAGE);
  const href = (p: Record<string, string | number | undefined>) =>
    buildQuery("/news", { category, q, year, page: 1, ...p });

  return (
    <>
      <PageHeader eyebrow="What's new" title="News & announcements" subtitle="Conference presentations, awards, publications and life in the lab." crumbs={[{ label: "News" }]} />
      <section className="section pt-12">
        <div className="container-page">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Link href={href({ category: undefined })} className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", !category ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={href({ category: c.slug })}
                  className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", category === c.slug ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <form action="/news" className="flex gap-2">
              {category && <input type="hidden" name="category" value={category} />}
              <select name="year" defaultValue={year ?? ""} className="h-10 rounded-full border bg-card px-4 text-sm" aria-label="Year">
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input name="q" defaultValue={q} placeholder="Search news" className="h-10 w-full rounded-full border bg-card pr-4 pl-10 text-sm sm:w-56" />
              </div>
              <button className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Filter</button>
            </form>
          </div>

          {posts.length ? (
            <div className="space-y-4">
              {posts.map((p) => <NewsRow key={p.id} post={p} />)}
            </div>
          ) : (
            <EmptyState icon={Newspaper} title="No news found" text="Try a different category, year or search term." />
          )}
          <Pagination page={page} pages={pages} hrefFor={(p) => href({ page: p })} />
        </div>
      </section>
    </>
  );
}
