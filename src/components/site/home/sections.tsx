import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { HomeSection, Member, NewsCategory, NewsPost, Notice, Partner, Publication, ResearchArea } from "@prisma/client";
import { asArray, asObject } from "@/lib/settings";
import { isSafeHref } from "@/lib/format";
import { cn } from "@/lib/utils";

const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-4",
  2: "lg:grid-cols-4",
  3: "lg:grid-cols-3 lg:max-w-4xl",
  4: "lg:grid-cols-4",
};
import { SectionHeading } from "../section-heading";
import { Reveal } from "../reveal";
import { RichText } from "../rich-text";
import { SmartImage } from "../smart-image";
import { MemberCard, NewsCard, PublicationItem, ResearchCard } from "../cards";
import { NoticeCard } from "../notice-card";

export type SectionContent = {
  eyebrow?: string;
  image?: string;
  highlights?: string[];
  limit?: number;
  memberGroup?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  slides?: { image: string; title: string; subtitle: string }[];
  stats?: { value: string; label: string }[];
};

export function content(section: HomeSection) {
  return asObject<SectionContent>(section.content);
}

export function primaryAction(c: SectionContent) {
  return c.primaryLabel && c.primaryHref && isSafeHref(c.primaryHref)
    ? { label: c.primaryLabel, href: c.primaryHref }
    : undefined;
}

export function secondaryAction(c: SectionContent) {
  return c.secondaryLabel && c.secondaryHref && isSafeHref(c.secondaryHref)
    ? { label: c.secondaryLabel, href: c.secondaryHref }
    : undefined;
}

export function AboutSection({ section }: { section: HomeSection }) {
  const c = content(section);
  const action = primaryAction(c);
  const highlights = asArray<string>(c.highlights).filter(Boolean);
  return (
    <section className="section">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          {c.image ? (
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl">
                <SmartImage src={c.image} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="absolute -right-4 -bottom-6 -z-10 h-2/3 w-2/3 rounded-[2rem] bg-brand-accent/20 sm:-right-8 sm:-bottom-8" />
              <div className="bg-grid absolute -top-8 -left-8 -z-10 size-40 rounded-3xl text-brand opacity-60" />
            </div>
          ) : (
            <div className="bg-ocean aspect-[4/3] rounded-[2rem]" />
          )}
        </Reveal>
        <Reveal delay={0.1}>
          {c.eyebrow && <p className="eyebrow mb-4">{c.eyebrow}</p>}
          {section.title && <h2 className="text-3xl font-bold sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">{section.title}</h2>}
          {section.subtitle && <p className="mt-4 text-lg text-muted-foreground">{section.subtitle}</p>}
          <RichText html={section.body} className="mt-6 prose-lg text-muted-foreground" />
          {highlights.length > 0 && (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((h) => (
                <li key={h} className="flex gap-3 rounded-2xl border bg-card p-4 text-sm font-medium">
                  <CheckCircle2 className="size-5 shrink-0 text-brand-accent" />
                  {h}
                </li>
              ))}
            </ul>
          )}
          {action && (
            <Link
              href={action.href}
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {action.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function ResearchSection({ section, areas }: { section: HomeSection; areas: ResearchArea[] }) {
  const c = content(section);
  if (!areas.length) return null;
  return (
    <section className="section bg-surface">
      <div className="container-page">
        <SectionHeading eyebrow={c.eyebrow} title={section.title} subtitle={section.subtitle} action={primaryAction(c)} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a, i) => (
            <Reveal key={a.id} delay={(i % 3) * 0.08}>
              <ResearchCard area={a} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewsSection({
  section,
  posts,
}: {
  section: HomeSection;
  posts: (NewsPost & { category: NewsCategory | null })[];
}) {
  const c = content(section);
  if (!posts.length) return null;
  const [first, ...rest] = posts;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow={c.eyebrow} title={section.title} subtitle={section.subtitle} action={primaryAction(c)} />
        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-3">
            <NewsCard post={first} featured />
          </Reveal>
          {rest.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <NewsCard post={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicationsSection({ section, pubs }: { section: HomeSection; pubs: Publication[] }) {
  const c = content(section);
  if (!pubs.length) return null;
  return (
    <section className="section bg-surface">
      <div className="container-page">
        <SectionHeading eyebrow={c.eyebrow} title={section.title} subtitle={section.subtitle} action={primaryAction(c)} />
        <div className="grid gap-6 lg:grid-cols-3">
          {pubs.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <PublicationItem pub={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MembersSection({ section, members }: { section: HomeSection; members: Member[] }) {
  const c = content(section);
  if (!members.length) return null;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow={c.eyebrow} title={section.title} subtitle={section.subtitle} action={primaryAction(c)} />
        <div className={cn("grid grid-cols-2 gap-x-6 gap-y-10", GRID_COLS[Math.min(members.length, 4)])}>
          {members.map((m, i) => (
            <Reveal key={m.id} delay={i * 0.06}>
              <MemberCard member={m} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnersSection({ section, partners }: { section: HomeSection; partners: Partner[] }) {
  const c = content(section);
  if (!partners.length) return null;
  const loop = [...partners, ...partners];
  return (
    <section className="border-y bg-surface py-16">
      <div className="container-page">
        <div className="mb-10 text-center">
          {c.eyebrow && <p className="eyebrow mb-3 justify-center">{c.eyebrow}</p>}
          {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
        </div>
      </div>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {loop.map((p, i) => {
            const inner = (
              <>
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo} alt="" className="h-10 w-auto max-w-[120px] object-contain grayscale transition group-hover:grayscale-0" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-xl bg-brand/10 font-heading text-sm font-bold text-brand dark:text-brand-accent">
                    {p.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                )}
                <span className="flex flex-col">
                  <span className="text-sm font-semibold whitespace-nowrap">{p.name}</span>
                  {p.country && <span className="text-xs text-muted-foreground">{p.country}</span>}
                </span>
              </>
            );
            const cls = "group flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 transition hover:shadow-md";
            return p.url && isSafeHref(p.url) ? (
              <a key={p.id + i} href={p.url} target="_blank" rel="noopener noreferrer" className={cls} aria-hidden={i >= partners.length}>
                {inner}
              </a>
            ) : (
              <div key={p.id + i} className={cls} aria-hidden={i >= partners.length}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function NoticesSection({ section, notices }: { section: HomeSection; notices: Notice[] }) {
  const c = content(section);
  if (!notices.length) return null;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow={c.eyebrow} title={section.title} subtitle={section.subtitle} action={primaryAction(c)} />
        <div className="grid gap-5 lg:grid-cols-2">
          {notices.map((n, i) => (
            <Reveal key={n.id} delay={(i % 2) * 0.08}>
              <NoticeCard notice={n} compact />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection({ section }: { section: HomeSection }) {
  const c = content(section);
  const primary = primaryAction(c);
  const secondary = secondaryAction(c);
  return (
    <section className="section">
      <div className="container-page">
        <Reveal>
          <div className="bg-ocean relative isolate overflow-hidden rounded-[2.5rem] px-6 py-16 text-white sm:px-16 sm:py-24">
            {c.image && (
              <SmartImage src={c.image} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-20 mix-blend-luminosity" />
            )}
            <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-brand-accent/30 blur-3xl" />
            <div className="mx-auto max-w-2xl text-center">
              {c.eyebrow && <p className="eyebrow mb-4 justify-center">{c.eyebrow}</p>}
              {section.title && <h2 className="text-3xl font-bold sm:text-5xl">{section.title}</h2>}
              {section.subtitle && <p className="mt-4 text-lg text-white/75">{section.subtitle}</p>}
              <RichText html={section.body} className="prose-invert mt-6 text-lg text-white/75" />
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                {primary && (
                  <Link href={primary.href} className="group inline-flex items-center gap-2 rounded-full bg-brand-accent px-7 py-3.5 text-sm font-semibold text-accent-fg transition hover:brightness-110">
                    {primary.label}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
                {secondary && (
                  <Link href={secondary.href} className="inline-flex items-center rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold transition hover:bg-white/10">
                    {secondary.label}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function CustomSection({ section }: { section: HomeSection }) {
  const c = content(section);
  return (
    <section className="section">
      <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className={c.image ? "" : "lg:col-span-2 mx-auto max-w-3xl"}>
          <SectionHeading eyebrow={c.eyebrow} title={section.title} subtitle={section.subtitle} />
          <RichText html={section.body} />
        </div>
        {c.image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
            <SmartImage src={c.image} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
