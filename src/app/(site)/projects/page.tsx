import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Briefcase } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState } from "@/components/site/cards";
import { SmartImage } from "@/components/site/smart-image";
import { Reveal } from "@/components/site/reveal";
import { StatusBadge } from "@/components/site/status-badge";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const settings = await getSettings();
  if (!settings.showProjects) notFound();
  const projects = await db.project.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  return (
    <>
      <PageHeader eyebrow="Funding" title="Projects & grants" subtitle="Research projects supported by national and international funding agencies." crumbs={[{ label: "Projects" }]} />
      <section className="section pt-12">
        <div className="container-page">
          {projects.length === 0 ? (
            <EmptyState icon={Briefcase} title="No projects yet" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((p, i) => (
                <Reveal key={p.id} delay={(i % 2) * 0.08}>
                  <Link href={`/projects/${p.slug}`} className="group card-hover flex h-full flex-col overflow-hidden rounded-3xl border bg-card sm:flex-row">
                    <div className="relative aspect-[16/10] shrink-0 overflow-hidden sm:aspect-auto sm:w-2/5">
                      {p.coverImage ? (
                        <SmartImage src={p.coverImage} alt="" fill sizes="(min-width:768px) 20vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="bg-ocean absolute inset-0" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        {(p.startYear || p.endYear) && <span className="text-xs text-muted-foreground">{p.startYear}–{p.endYear ?? "present"}</span>}
                      </div>
                      <h2 className="mt-3 text-lg font-bold transition group-hover:text-brand dark:group-hover:text-brand-accent">{p.title}</h2>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.summary}</p>
                      <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
                        <span className="font-medium text-foreground/80">{p.funder}</span>
                        <ArrowUpRight className="size-4 text-brand-accent" />
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
