import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { asArray } from "@/lib/settings";
import { formatDate, isSafeHref } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { SmartImage } from "@/components/site/smart-image";
import { CategoryPill, NewsCard } from "@/components/site/cards";
import { ShareButtons } from "@/components/site/share-buttons";

type Presentation = { title: string; presenters: string; date: string; format: string };

async function load(slug: string) {
  return db.newsPost.findFirst({ where: { slug, published: true }, include: { category: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await load((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { type: "article", publishedTime: post.date.toISOString(), images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function NewsDetail({ params }: { params: Promise<{ slug: string }> }) {
  const post = await load((await params).slug);
  if (!post) notFound();
  const presentations = asArray<Presentation>(post.presentations).filter((p) => p.title);
  const related = await db.newsPost.findMany({
    where: { published: true, id: { not: post.id } },
    orderBy: { date: "desc" },
    take: 3,
    include: { category: true },
  });

  return (
    <>
      <PageHeader title={post.title} image={post.coverImage} crumbs={[{ label: "News", href: "/news" }, { label: formatDate(post.date) }]} />
      <article className="section pt-12">
        <div className="container-page max-w-4xl">
          <div className="flex flex-wrap items-center gap-4 border-b pb-6 text-sm text-muted-foreground">
            <CategoryPill category={post.category} />
            <span className="inline-flex items-center gap-1.5"><Calendar className="size-4" /> {formatDate(post.date, "MMMM d, yyyy")}</span>
            {post.venue && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {post.venue}</span>}
            <ShareButtons title={post.title} className="ml-auto" />
          </div>

          {post.coverImage && (
            <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-[2rem] shadow-xl">
              <SmartImage src={post.coverImage} alt="" fill loading="eager" sizes="(min-width:1024px) 896px, 100vw" className="object-cover" />
            </div>
          )}
          {post.excerpt && <p className="mt-10 text-xl leading-relaxed font-medium text-foreground/80">{post.excerpt}</p>}
          <RichText html={post.body} className="prose-lg mt-6" />

          {presentations.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-6 text-2xl font-bold">Presentations</h2>
              <ol className="space-y-3">
                {presentations.map((p, i) => (
                  <li key={i} className="flex gap-4 rounded-2xl border bg-card p-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-heading text-sm font-bold text-accent-foreground">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold">{p.title}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        {p.presenters && <span><span className="font-medium text-foreground/70">Presenters:</span> {p.presenters}</span>}
                        {p.date && <span><span className="font-medium text-foreground/70">Date:</span> {p.date}</span>}
                        {p.format && <span className="rounded-full bg-muted px-2 text-xs leading-5">{p.format}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {post.externalUrl && isSafeHref(post.externalUrl) && (
            <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-10 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted">
              <ExternalLink className="size-4" /> Visit official website
            </a>
          )}

          <div className="mt-12 border-t pt-8">
            <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
              <ArrowLeft className="size-4" /> All news
            </Link>
          </div>
        </div>

        {related.length > 0 && (
          <div className="container-page mt-20">
            <h2 className="mb-8 text-2xl font-bold">More news</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((r) => <NewsCard key={r.id} post={r} />)}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
