import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { ResearchCard, EmptyState } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { FlaskConical } from "lucide-react";

export const metadata: Metadata = { title: "Research" };

export default async function ResearchPage() {
  const [settings, areas] = await Promise.all([
    getSettings(),
    db.researchArea.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Our research"
        subtitle={settings.description}
        image={areas[0]?.coverImage}
        crumbs={[{ label: "Research" }]}
      />
      <section className="section">
        <div className="container-page">
          {areas.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((a, i) => (
                <Reveal key={a.id} delay={(i % 3) * 0.08}>
                  <ResearchCard area={a} index={i} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState icon={FlaskConical} title="No research areas yet" text="Research themes added in the admin panel will appear here." />
          )}
        </div>
      </section>
    </>
  );
}
