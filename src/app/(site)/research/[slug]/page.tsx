import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { asArray } from "@/lib/settings";
import { safeImage } from "@/lib/safe";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { SmartImage } from "@/components/site/smart-image";
import { MemberAvatar, PublicationItem } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { GalleryGrid } from "@/components/site/gallery-grid";

async function load(slug: string) {
  return db.researchArea.findFirst({
    where: { slug, published: true },
    include: {
      equipment: { orderBy: { order: "asc" } },
      members: { where: { published: true }, orderBy: { order: "asc" } },
      publications: { where: { published: true }, orderBy: { year: "desc" }, take: 6 },
      projects: { where: { published: true }, orderBy: { order: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const area = await load((await params).slug);
  if (!area) return {};
  return {
    title: area.title,
    description: area.summary,
    openGraph: { images: area.coverImage ? [area.coverImage] : undefined },
  };
}

export default async function ResearchDetail({ params }: { params: Promise<{ slug: string }> }) {
  const area = await load((await params).slug);
  if (!area) notFound();

  const siblings = await db.researchArea.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: { slug: true, title: true },
  });
  const idx = siblings.findIndex((s) => s.slug === area.slug);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];
  const gallery = asArray<string>(area.gallery).map(safeImage).filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={area.subtitle || "Research"}
        title={area.title}
        subtitle={area.summary}
        image={area.coverImage}
        crumbs={[{ label: "Research", href: "/research" }, { label: area.title }]}
      />

      <section className="section">
        <div className="container-page grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {area.coverImage && (
              <Reveal className="relative mb-12 aspect-[16/9] overflow-hidden rounded-[2rem] shadow-xl">
                <SmartImage src={area.coverImage} alt={area.title} fill loading="eager" sizes="(min-width:1024px) 66vw, 100vw" className="object-cover" />
              </Reveal>
            )}
            <RichText html={area.body} className="prose-lg" />

            {area.equipment.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold">Equipment & facilities</h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {area.equipment.map((e) => (
                    <div key={e.id} className="overflow-hidden rounded-3xl border bg-card">
                      {e.image && (
                        <div className="relative aspect-[16/9]">
                          <SmartImage src={e.image} alt={e.name} fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover" />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="font-bold">{e.name}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gallery.length > 0 && (
              <div className="mt-16">
                <h2 className="mb-6 text-2xl font-bold">Gallery</h2>
                <GalleryGrid images={gallery.map((url) => ({ url, caption: "" }))} />
              </div>
            )}

            {area.publications.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold">Selected publications</h2>
                <div className="mt-6 grid gap-5">
                  {area.publications.map((p) => (
                    <PublicationItem key={p.id} pub={p} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-8 lg:col-span-4">
            <div className="sticky top-28 space-y-8">
              {area.members.length > 0 && (
                <div className="rounded-3xl border bg-card p-6">
                  <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Team</h2>
                  <ul className="mt-5 space-y-4">
                    {area.members.map((m) => (
                      <li key={m.id}>
                        <Link href={`/members/${m.slug}`} className="group flex items-center gap-3">
                          <MemberAvatar member={m} className="size-12 shrink-0 rounded-full [&_span]:text-sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold transition group-hover:text-brand dark:group-hover:text-brand-accent">{m.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{m.position}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {area.projects.length > 0 && (
                <div className="rounded-3xl border bg-card p-6">
                  <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Projects</h2>
                  <ul className="mt-5 space-y-4">
                    {area.projects.map((p) => (
                      <li key={p.id}>
                        <Link href={`/projects/${p.slug}`} className="group block">
                          <span className="block font-semibold transition group-hover:text-brand dark:group-hover:text-brand-accent">{p.title}</span>
                          <span className="text-xs text-muted-foreground">{p.funder}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-ocean rounded-3xl p-6 text-white">
                <h2 className="text-lg font-bold">Interested in this research?</h2>
                <p className="mt-2 text-sm text-white/70">We welcome students and collaborators.</p>
                <Link href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-accent-fg">
                  Get in touch <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {(prev || next) && (
          <div className="container-page mt-20">
            <div className="grid gap-4 border-t pt-10 sm:grid-cols-2">
              {prev ? (
                <Link href={`/research/${prev.slug}`} className="group rounded-3xl border p-6 transition hover:bg-muted">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" /> Previous</span>
                  <span className="mt-2 block font-bold">{prev.title}</span>
                </Link>
              ) : <span />}
              {next && (
                <Link href={`/research/${next.slug}`} className="group rounded-3xl border p-6 text-right transition hover:bg-muted">
                  <span className="flex items-center justify-end gap-2 text-xs text-muted-foreground">Next <ArrowRight className="size-3.5" /></span>
                  <span className="mt-2 block font-bold">{next.title}</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
