import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

// Built per request from the database (never at build time).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const s = await getSettings();
  const [research, members, news, projects, events, albums, pages] = await Promise.all([
    db.researchArea.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.member.findMany({ where: { published: true, status: "APPROVED" }, select: { slug: true, updatedAt: true } }),
    db.newsPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    s.showProjects ? db.project.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }) : [],
    s.showEvents ? db.event.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }) : [],
    s.showGallery ? db.galleryAlbum.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }) : [],
    db.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = [
    "", "/research", "/members", "/news", "/contact",
    s.showPublications && "/publications", s.showProjects && "/projects", s.showEvents && "/events",
    s.showGallery && "/gallery", s.showJoinUs && "/join-us",
  ].filter((p): p is string => typeof p === "string");
  const entry = (path: string, lastModified?: Date) => ({ url: `${base}${path}`, lastModified });
  return [
    ...staticPaths.map((p) => entry(p)),
    ...research.map((r) => entry(`/research/${r.slug}`, r.updatedAt)),
    ...members.map((r) => entry(`/members/${r.slug}`, r.updatedAt)),
    ...news.map((r) => entry(`/news/${r.slug}`, r.updatedAt)),
    ...projects.map((r) => entry(`/projects/${r.slug}`, r.updatedAt)),
    ...events.map((r) => entry(`/events/${r.slug}`, r.updatedAt)),
    ...albums.map((r) => entry(`/gallery/${r.slug}`, r.updatedAt)),
    ...pages.map((r) => entry(`/p/${r.slug}`, r.updatedAt)),
  ];
}
