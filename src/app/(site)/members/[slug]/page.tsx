import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { asArray, type LinkItem } from "@/lib/settings";
import { isSafeHref, stripHtmlSafe } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { MemberAvatar } from "@/components/site/cards";
import { SocialIcon, detectPlatform } from "@/components/site/social-icon";

async function load(slug: string) {
  return db.member.findFirst({
    where: { slug, published: true },
    include: { category: true, researchAreas: { where: { published: true }, orderBy: { order: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = await load((await params).slug);
  if (!m) return {};
  return {
    title: m.name,
    description: `${m.position}${m.researchInterests ? ` — ${m.researchInterests}` : ""}`.slice(0, 160) || stripHtmlSafe(m.bio),
    openGraph: { images: m.photo ? [m.photo] : undefined },
  };
}

export default async function MemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const m = await load((await params).slug);
  if (!m) notFound();
  const links = asArray<LinkItem>(m.links).filter((l) => l.url && isSafeHref(l.url));
  const interests = m.researchInterests.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={m.isAlumni ? "Alumni" : m.category?.name}
        title={m.name}
        subtitle={m.position}
        crumbs={[{ label: "Members", href: "/members" }, { label: m.name }]}
      />
      <section className="section pt-12">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <MemberAvatar member={m} eager className="aspect-[4/5] rounded-[2rem] shadow-2xl [&_span]:text-6xl" />
              <div className="space-y-3 rounded-3xl border bg-card p-6 text-sm">
                {m.email && (
                  <a href={`mailto:${m.email}`} className="flex items-center gap-3 break-all transition hover:text-brand dark:hover:text-brand-accent">
                    <Mail className="size-4 shrink-0 text-brand-accent" /> {m.email}
                  </a>
                )}
                {m.phone && (
                  <p className="flex items-center gap-3"><Phone className="size-4 shrink-0 text-brand-accent" /> {m.phone}</p>
                )}
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
                      >
                        <SocialIcon platform={detectPlatform(l.label, l.url)} className="size-3.5" />
                        {l.label || "Link"}
                      </a>
                    ))}
                  </div>
                )}
                {!m.email && !m.phone && links.length === 0 && <p className="text-muted-foreground">No contact details listed.</p>}
              </div>
            </div>
          </aside>
          <div className="space-y-12 lg:col-span-8">
            {m.bio ? (
              <div>
                <h2 className="mb-4 text-2xl font-bold">Biography</h2>
                <RichText html={m.bio} className="prose-lg" />
              </div>
            ) : null}
            {interests.length > 0 && (
              <div>
                <h2 className="mb-4 text-2xl font-bold">Research interests</h2>
                <div className="flex flex-wrap gap-2">
                  {interests.map((i) => (
                    <span key={i} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">{i}</span>
                  ))}
                </div>
              </div>
            )}
            {m.education && (
              <div>
                <h2 className="mb-4 text-2xl font-bold">Education</h2>
                <ul className="space-y-3 border-l-2 border-brand-accent/40 pl-6">
                  {m.education.split("\n").filter(Boolean).map((e) => (
                    <li key={e} className="relative text-muted-foreground before:absolute before:top-2 before:-left-[31px] before:size-2.5 before:rounded-full before:bg-brand-accent">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.isAlumni && m.currentPosition && (
              <div className="rounded-3xl border bg-card p-6">
                <p className="text-sm text-muted-foreground">Current position</p>
                <p className="mt-1 text-lg font-semibold">{m.currentPosition}</p>
              </div>
            )}
            {m.researchAreas.length > 0 && (
              <div>
                <h2 className="mb-4 text-2xl font-bold">Research areas</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {m.researchAreas.map((a) => (
                    <Link key={a.id} href={`/research/${a.slug}`} className="rounded-2xl border bg-card p-5 transition hover:border-brand-accent/50 hover:shadow-md">
                      <p className="font-semibold">{a.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <Link href="/members" className="inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
              <ArrowLeft className="size-4" /> All members
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
