import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";

export type SearchHit = { type: string; title: string; subtitle: string; href: string };

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  if (!(await rateLimit(`search:${await clientIpHash()}`, 120, 60 * 1000))) {
    return NextResponse.json({ results: [] }, { status: 429 });
  }

  const contains = { contains: q, mode: "insensitive" as const };
  const [research, members, news, pubs, pages, projects] = await Promise.all([
    db.researchArea.findMany({ where: { published: true, OR: [{ title: contains }, { summary: contains }] }, take: 5 }),
    db.member.findMany({ where: { published: true, status: "APPROVED", OR: [{ name: contains }, { position: contains }, { researchInterests: contains }] }, take: 5 }),
    db.newsPost.findMany({ where: { published: true, OR: [{ title: contains }, { excerpt: contains }] }, orderBy: { date: "desc" }, take: 5 }),
    db.publication.findMany({ where: { published: true, OR: [{ title: contains }, { authors: contains }, { venue: contains }] }, orderBy: { year: "desc" }, take: 5 }),
    db.page.findMany({ where: { published: true, title: contains }, take: 3 }),
    db.project.findMany({ where: { published: true, OR: [{ title: contains }, { summary: contains }] }, take: 3 }),
  ]);

  const results: SearchHit[] = [
    ...research.map((r) => ({ type: "Research", title: r.title, subtitle: r.subtitle, href: `/research/${r.slug}` })),
    ...members.map((m) => ({ type: "People", title: m.name, subtitle: m.position, href: `/members/${m.slug}` })),
    ...news.map((n) => ({ type: "News", title: n.title, subtitle: n.date.toISOString().slice(0, 10), href: `/news/${n.slug}` })),
    ...pubs.map((p) => ({ type: "Publications", title: p.title, subtitle: `${p.authors} · ${p.year}`, href: `/publications?q=${encodeURIComponent(p.title.slice(0, 60))}` })),
    ...projects.map((p) => ({ type: "Projects", title: p.title, subtitle: p.funder, href: `/projects/${p.slug}` })),
    ...pages.map((p) => ({ type: "Pages", title: p.title, subtitle: p.subtitle, href: `/p/${p.slug}` })),
  ];
  return NextResponse.json({ results });
}
