import type { Metadata } from "next";
import { GraduationCap, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { EmptyState, MemberAvatar, MemberCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = { title: "Members" };

/** Never send private member columns to a public page. */
const PUBLIC_CARD = {
  id: true,
  slug: true,
  name: true,
  position: true,
  photo: true,
  program: true,
  currentPosition: true,
  graduationYear: true,
  isAlumni: true,
} as const;

export default async function MembersPage() {
  const [settings, groups, ungrouped, alumni] = await Promise.all([
    getSettings(),
    db.memberCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        members: {
          where: { published: true, status: "APPROVED", isAlumni: false },
          orderBy: { order: "asc" },
          select: PUBLIC_CARD,
        },
      },
    }),
    db.member.findMany({ where: { published: true, status: "APPROVED", isAlumni: false, categoryId: null }, orderBy: { order: "asc" }, select: PUBLIC_CARD }),
    db.member.findMany({ where: { published: true, status: "APPROVED", isAlumni: true }, orderBy: [{ graduationYear: "desc" }, { order: "asc" }], select: PUBLIC_CARD }),
  ]);

  const sections = [
    ...groups.filter((g) => g.members.length).map((g) => ({ id: g.slug, name: g.name, members: g.members })),
    ...(ungrouped.length ? [{ id: "team", name: "Team", members: ungrouped }] : []),
  ];
  const showAlumni = settings.showAlumni && alumni.length > 0;
  const total = sections.reduce((n, s) => n + s.members.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Members"
        subtitle={`${total} researchers and students working together at the ${settings.labName}.`}
        crumbs={[{ label: "Members" }]}
      />

      {sections.length > 1 && (
        <div className="glass sticky top-[72px] z-30 border-b">
          <nav className="container-page flex gap-2 overflow-x-auto py-3" aria-label="Member groups">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition hover:border-brand-accent hover:text-brand dark:hover:text-brand-accent">
                {s.name} <span className="ml-1 text-muted-foreground">{s.members.length}</span>
              </a>
            ))}
            {showAlumni && (
              <a href="#alumni" className="shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition hover:border-brand-accent">
                Alumni <span className="ml-1 text-muted-foreground">{alumni.length}</span>
              </a>
            )}
          </nav>
        </div>
      )}

      <div className="container-page space-y-24 py-20">
        {sections.length === 0 && <EmptyState icon={Users} title="No members yet" />}
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-40">
            <Reveal className="mb-10 flex items-end justify-between border-b pb-5">
              <h2 className="text-2xl font-bold sm:text-3xl">{s.name}</h2>
              <span className="text-sm text-muted-foreground">{s.members.length} {s.members.length === 1 ? "member" : "members"}</span>
            </Reveal>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {s.members.map((m, i) => (
                <Reveal key={m.id} delay={(i % 5) * 0.05}>
                  <MemberCard member={m} />
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        {showAlumni && (
          <section id="alumni" className="scroll-mt-40">
            <Reveal className="mb-10 flex items-end justify-between border-b pb-5">
              <h2 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
                <GraduationCap className="size-7 text-brand-accent" /> Alumni
              </h2>
              <span className="text-sm text-muted-foreground">{alumni.length} alumni</span>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alumni.map((a) => (
                <div key={a.id} className="flex items-center gap-4 rounded-3xl border bg-card p-4">
                  <MemberAvatar member={a} className="size-16 shrink-0 rounded-2xl [&_span]:text-lg" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.position}</p>
                    {a.currentPosition && <p className="mt-1 truncate text-xs font-medium text-brand dark:text-brand-accent">→ {a.currentPosition}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
