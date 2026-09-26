import Link from "next/link";
import { ArrowUpRight, BookOpen, Calendar, ExternalLink, FileDown, MapPin, Mic } from "lucide-react";
import type { Member, NewsCategory, NewsPost, Publication, ResearchArea } from "@prisma/client";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";

export function ResearchCard({ area, index }: { area: ResearchArea; index: number }) {
  return (
    <Link
      href={`/research/${area.slug}`}
      className="group card-hover relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {area.coverImage ? (
          <SmartImage
            src={area.coverImage}
            alt={area.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="bg-ocean absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 font-heading text-xs font-bold text-brand backdrop-blur">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {area.subtitle && <p className="text-xs font-semibold tracking-wider text-brand-accent uppercase">{area.subtitle}</p>}
        <h3 className="mt-2 text-xl font-bold text-foreground">{area.title}</h3>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{area.summary}</p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand dark:text-brand-accent">
          Learn more
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function CategoryPill({ category, className }: { category: Pick<NewsCategory, "name" | "color"> | null; className?: string }) {
  if (!category) return null;
  const color = /^#[0-9a-f]{6}$/i.test(category.color) ? category.color : "#14b8a6";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase", className)}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {category.name}
    </span>
  );
}

type NewsWithCategory = NewsPost & { category: NewsCategory | null };

export function NewsCard({ post, featured = false }: { post: NewsWithCategory; featured?: boolean }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className={cn("group card-hover flex h-full flex-col overflow-hidden rounded-3xl border bg-card", featured && "lg:flex-row")}
    >
      <div className={cn("relative aspect-[16/10] shrink-0 overflow-hidden", featured && "lg:aspect-auto lg:w-1/2")}>
        {post.coverImage ? (
          <SmartImage
            src={post.coverImage}
            alt=""
            fill
            sizes={featured ? "(min-width:1024px) 40vw, 100vw" : "(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="bg-ocean absolute inset-0" />
        )}
      </div>
      <div className={cn("flex flex-1 flex-col p-6", featured && "lg:p-10")}>
        <div className="flex flex-wrap items-center gap-3">
          <CategoryPill category={post.category} />
          <time className="text-xs text-muted-foreground" dateTime={post.date.toISOString()}>{formatDate(post.date)}</time>
        </div>
        <h3 className={cn("mt-4 font-bold text-foreground transition group-hover:text-brand dark:group-hover:text-brand-accent", featured ? "text-2xl lg:text-3xl" : "text-lg leading-snug")}>
          {post.title}
        </h3>
        {post.excerpt && (
          <p className={cn("mt-3 text-sm leading-relaxed text-muted-foreground", featured ? "line-clamp-4" : "line-clamp-3")}>{post.excerpt}</p>
        )}
        {featured && Array.isArray(post.presentations) && post.presentations.length > 0 && (
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand dark:text-brand-accent">
            <Mic className="size-4" /> {post.presentations.length} presentations
          </p>
        )}
      </div>
    </Link>
  );
}

export function NewsRow({ post }: { post: NewsWithCategory }) {
  const count = Array.isArray(post.presentations) ? post.presentations.length : 0;
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group grid gap-5 rounded-3xl border bg-card p-5 transition hover:border-brand-accent/40 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6"
    >
      <div className="flex items-center gap-4 sm:w-24 sm:flex-col sm:items-start sm:gap-0">
        <span className="font-heading text-3xl font-bold text-foreground">{formatDate(post.date, "dd")}</span>
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{formatDate(post.date, "MMM yyyy")}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryPill category={post.category} />
          {post.venue && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {post.venue}
            </span>
          )}
          {count > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mic className="size-3" /> {count} presentations
            </span>
          )}
        </div>
        <h3 className="mt-2 text-lg font-bold text-foreground transition group-hover:text-brand dark:group-hover:text-brand-accent">{post.title}</h3>
        {post.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
      </div>
      {post.coverImage && (
        <div className="relative hidden aspect-[4/3] w-36 overflow-hidden rounded-2xl sm:block">
          <SmartImage src={post.coverImage} alt="" fill sizes="144px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}
    </Link>
  );
}

export function MemberAvatar({ member, className, eager = false }: { member: Pick<Member, "name" | "photo">; className?: string; eager?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-brand to-brand-accent", className)}>
      {member.photo ? (
        <SmartImage src={member.photo} alt={member.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" loading={eager ? "eager" : "lazy"} />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-heading text-3xl font-bold text-white/90">{initials(member.name)}</span>
      )}
    </div>
  );
}

export type PublicMember = Pick<Member, "id" | "slug" | "name" | "position" | "photo"> &
  Partial<Pick<Member, "program" | "currentPosition" | "graduationYear" | "isAlumni">>;

export function MemberCard({ member }: { member: PublicMember }) {
  return (
    <Link href={`/members/${member.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-3xl">
        <MemberAvatar member={member} className="aspect-[4/5] transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute right-4 bottom-4 grid size-10 translate-y-2 place-items-center rounded-full bg-white text-brand opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="mt-4 px-1">
        <h3 className="font-bold text-foreground transition group-hover:text-brand dark:group-hover:text-brand-accent">{member.name}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{member.position}</p>
      </div>
    </Link>
  );
}

export function PublicationItem({ pub, showAbstract = false }: { pub: Publication; showAbstract?: boolean }) {
  const doiUrl = pub.doi ? `https://doi.org/${pub.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}` : "";
  const link = pub.url || doiUrl;
  return (
    <article className="group relative rounded-3xl border bg-card p-6 transition hover:border-brand-accent/40 hover:shadow-lg sm:p-7">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand px-2.5 py-1 font-bold text-brand-fg">{pub.year}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{pub.type}</span>
      </div>
      <h3 className="mt-4 text-lg leading-snug font-bold text-foreground">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="transition hover:text-brand dark:hover:text-brand-accent">
            {pub.title}
          </a>
        ) : (
          pub.title
        )}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{pub.authors}</p>
      {pub.venue && (
        <p className="mt-1 text-sm">
          <span className="font-medium text-foreground/80 italic">{pub.venue}</span>
          {pub.volume && <span className="text-muted-foreground">, {pub.volume}</span>}
          {pub.pages && <span className="text-muted-foreground">, {pub.pages}</span>}
        </p>
      )}
      {showAbstract && pub.abstract && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-brand select-none dark:text-brand-accent">Abstract</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">{pub.abstract}</p>
        </details>
      )}
      {(doiUrl || pub.pdfUrl || pub.url) && (
        <div className="mt-5 flex flex-wrap gap-2">
          {doiUrl && (
            <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
              <BookOpen className="size-3.5" /> DOI
            </a>
          )}
          {pub.pdfUrl && (
            <a href={pub.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
              <FileDown className="size-3.5" /> PDF
            </a>
          )}
          {pub.url && pub.url !== doiUrl && (
            <a href={pub.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
              <ExternalLink className="size-3.5" /> Link
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export function EmptyState({ title, text, icon: Icon = Calendar }: { title: string; text?: string; icon?: typeof Calendar }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
