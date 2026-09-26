import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Images } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/cards";
import { SmartImage } from "@/components/site/smart-image";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const settings = await getSettings();
  if (!settings.showGallery) notFound();
  const albums = await db.galleryAlbum.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { images: true } }, images: { take: 1, orderBy: { order: "asc" } } },
  });
  return (
    <>
      <PageHeader eyebrow="Moments" title="Gallery" subtitle="Life in the lab, fieldwork and events." crumbs={[{ label: "Gallery" }]} />
      <section className="section pt-12">
        <div className="container-page">
          {albums.length === 0 ? (
            <EmptyState icon={Images} title="No albums yet" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((a, i) => {
                const cover = a.coverImage || a.images[0]?.url;
                return (
                  <Reveal key={a.id} delay={(i % 3) * 0.08}>
                    <Link href={`/gallery/${a.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl">
                      {cover ? (
                        <SmartImage src={cover} alt="" fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="bg-ocean absolute inset-0" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                        <p className="text-xs font-medium text-white/70">{a._count.images} photos{a.date ? ` · ${formatDate(a.date, "MMMM yyyy")}` : ""}</p>
                        <h2 className="mt-1 text-xl font-bold">{a.title}</h2>
                        {a.description && <p className="mt-1 line-clamp-2 text-sm text-white/75">{a.description}</p>}
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
