import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { StatusBadge } from "@/components/site/status-badge";

async function load(slug: string) {
  return db.project.findFirst({ where: { slug, published: true }, include: { researchAreas: { where: { published: true } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, description: p.summary } : {};
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const settings = await getSettings();
  const p = await load((await params).slug);
  if (!p || !settings.showProjects) notFound();
  const facts = [
    ["Funding agency", p.funder],
    ["Lab role", p.role],
    ["Period", p.startYear || p.endYear ? `${p.startYear ?? ""}–${p.endYear ?? "present"}` : ""],
    ["Budget", p.amount],
  ].filter(([, v]) => v);

  return (
    <>
      <PageHeader eyebrow="Project" title={p.title} subtitle={p.summary} image={p.coverImage} crumbs={[{ label: "Projects", href: "/projects" }, { label: p.title }]} />
      <section className="section pt-12">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RichText html={p.body} className="prose-lg" />
            <Link href="/projects" className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
              <ArrowLeft className="size-4" /> All projects
            </Link>
          </div>
          <aside className="lg:col-span-4">
            <dl className="sticky top-28 space-y-5 rounded-3xl border bg-card p-6">
              <div><StatusBadge status={p.status} /></div>
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{k}</dt>
                  <dd className="mt-1 font-medium">{v}</dd>
                </div>
              ))}
              {p.researchAreas.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Research areas</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {p.researchAreas.map((a) => (
                      <Link key={a.id} href={`/research/${a.slug}`} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{a.title}</Link>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </section>
    </>
  );
}
