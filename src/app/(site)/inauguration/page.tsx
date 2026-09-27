import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { ceremonyContent } from "@/lib/inauguration";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";
import { CeremonyReplay } from "@/components/site/ceremony/ceremony-replay";

export const metadata: Metadata = { title: "Inauguration" };

export default async function InaugurationPage() {
  const settings = await getSettings();
  const content = ceremonyContent(settings);

  return (
    <>
      <PageHeader
        eyebrow="Ceremony"
        title="Website inauguration"
        subtitle={
          settings.inauguratedAt
            ? `Inaugurated on ${formatDate(settings.inauguratedAt, "d MMMM yyyy, h:mm a")}.`
            : "The website inauguration ceremony."
        }
        crumbs={[{ label: "Inauguration" }]}
      />
      <section className="section pt-12">
        <div className="container-page max-w-3xl space-y-8">
          <div className="rounded-3xl border bg-card p-6 text-center sm:p-10">
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Inaugurated by</p>
            <p className="mt-3 font-heading text-2xl font-bold sm:text-3xl">{content.guestName || "—"}</p>
            {content.guestTitle && <p className="mt-1 text-muted-foreground">{content.guestTitle}</p>}
            <p className="mt-4 text-sm text-muted-foreground">
              {content.date || (settings.inauguratedAt ? formatDate(settings.inauguratedAt, "d MMMM yyyy") : "")}
            </p>
            <div className="mx-auto my-8 h-px w-24 bg-gradient-to-r from-transparent via-brand-accent to-transparent" />
            <p className="text-sm text-muted-foreground">
              {content.labName}
              {content.department ? ` · ${content.department}` : ""}
            </p>
            <CeremonyReplay content={content} />
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand dark:text-brand-accent">
            <ArrowLeft className="size-4" /> Back to the website
          </Link>
        </div>
      </section>
    </>
  );
}
