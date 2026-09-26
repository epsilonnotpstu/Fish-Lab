import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import { safeImage } from "@/lib/safe";
import { PageHeader } from "@/components/site/page-header";
import { GalleryGrid } from "@/components/site/gallery-grid";

async function load(slug: string) {
  return db.galleryAlbum.findFirst({ where: { slug, published: true }, include: { images: { orderBy: { order: "asc" } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await load((await params).slug);
  return a ? { title: a.title, description: a.description } : {};
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const settings = await getSettings();
  const album = await load((await params).slug);
  if (!album || !settings.showGallery) notFound();
  const images = album.images.map((i) => ({ url: safeImage(i.url), caption: i.caption })).filter((i) => i.url);
  return (
    <>
      <PageHeader
        eyebrow={album.date ? formatDate(album.date, "MMMM yyyy") : "Album"}
        title={album.title}
        subtitle={album.description}
        image={album.coverImage}
        crumbs={[{ label: "Gallery", href: "/gallery" }, { label: album.title }]}
      />
      <section className="section pt-12">
        <div className="container-page">
          <GalleryGrid images={images} />
          <Link href="/gallery" className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
            <ArrowLeft className="size-4" /> All albums
          </Link>
        </div>
      </section>
    </>
  );
}
