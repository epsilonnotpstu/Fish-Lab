import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";

async function load(slug: string) {
  return db.page.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.title, description: p.seoDescription || p.subtitle } : {};
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await load((await params).slug);
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} subtitle={page.subtitle} image={page.coverImage} crumbs={[{ label: page.title }]} />
      <section className="section pt-12">
        <div className="container-page max-w-4xl">
          <RichText html={page.body} className="prose-lg" />
        </div>
      </section>
    </>
  );
}
