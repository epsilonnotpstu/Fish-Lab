import { db } from "@/lib/db";
import { asArray } from "@/lib/settings";
import { Hero, type HeroSlide } from "@/components/site/home/hero";
import { Stats } from "@/components/site/home/stats";
import { listNotices } from "@/lib/notices";
import {
  AboutSection,
  content,
  CtaSection,
  CustomSection,
  MembersSection,
  NewsSection,
  NoticesSection,
  PartnersSection,
  primaryAction,
  PublicationsSection,
  ResearchSection,
  secondaryAction,
} from "@/components/site/home/sections";
import { safeImage } from "@/lib/safe";

async function liveCounts() {
  const [members, publications, projects, partners, research, alumni] = await Promise.all([
    db.member.count({ where: { published: true, status: "APPROVED", isAlumni: false } }),
    db.publication.count({ where: { published: true } }),
    db.project.count({ where: { published: true } }),
    db.partner.count({ where: { published: true } }),
    db.researchArea.count({ where: { published: true } }),
    db.member.count({ where: { published: true, status: "APPROVED", isAlumni: true } }),
  ]);
  return { members, publications, projects, partners, research, alumni } as Record<string, number>;
}

export default async function HomePage() {
  const sections = await db.homeSection.findMany({ where: { visible: true }, orderBy: { order: "asc" } });
  const has = (t: string) => sections.some((s) => s.type === t);
  const limitOf = (t: string, fallback: number) => {
    const s = sections.find((x) => x.type === t);
    const n = s ? Number(content(s).limit) : NaN;
    return Number.isInteger(n) && n > 0 && n <= 24 ? n : fallback;
  };
  const membersSection = sections.find((s) => s.type === "members");
  const memberGroup = membersSection ? content(membersSection).memberGroup : undefined;

  const [areas, posts, pubs, members, partners, counts, notices] = await Promise.all([
    has("research") ? db.researchArea.findMany({ where: { published: true }, orderBy: { order: "asc" }, take: limitOf("research", 6) }) : [],
    has("news")
      ? db.newsPost.findMany({ where: { published: true }, orderBy: [{ pinned: "desc" }, { date: "desc" }], take: limitOf("news", 4), include: { category: true } })
      : [],
    has("publications")
      ? db.publication.findMany({ where: { published: true, featured: true }, orderBy: [{ year: "desc" }], take: limitOf("publications", 3) })
      : [],
    has("members")
      ? db.member.findMany({
          where: { published: true, status: "APPROVED", isAlumni: false, ...(memberGroup ? { category: { slug: memberGroup } } : {}) },
          orderBy: { order: "asc" },
          take: limitOf("members", 4),
        })
      : [],
    has("partners") ? db.partner.findMany({ where: { published: true }, orderBy: { order: "asc" } }) : [],
    has("stats") ? liveCounts() : ({} as Record<string, number>),
    has("notices") ? listNotices("PUBLIC", limitOf("notices", 2)) : [],
  ]);

  return (
    <div className={sections[0]?.type === "hero" ? undefined : "pt-28"}>
      {sections.map((section, i) => {
        const c = content(section);
        const anchor = i === 1 ? <div id="content" className="scroll-mt-24" /> : null;
        let node: React.ReactNode = null;
        switch (section.type) {
          case "hero": {
            const slides = asArray<HeroSlide>(c.slides)
              .map((s) => ({ image: safeImage(s.image), title: s.title ?? "", subtitle: s.subtitle ?? "" }))
              .filter((s) => s.image);
            node = (
              <Hero
                slides={slides}
                eyebrow={c.eyebrow}
                title={section.title}
                subtitle={section.subtitle}
                primary={primaryAction(c)}
                secondary={secondaryAction(c)}
              />
            );
            break;
          }
          case "stats": {
            const items = asArray<{ value: string; label: string }>(c.stats).map((s) => ({
              label: s.label,
              value: String(s.value ?? "").replace(/\{(\w+)\}/g, (_, k: string) => String(counts[k] ?? 0)),
            }));
            node = <Stats items={items} />;
            break;
          }
          case "about":
            node = <AboutSection section={section} />;
            break;
          case "research":
            node = <ResearchSection section={section} areas={areas} />;
            break;
          case "news":
            node = <NewsSection section={section} posts={posts} />;
            break;
          case "publications":
            node = <PublicationsSection section={section} pubs={pubs} />;
            break;
          case "members":
            node = <MembersSection section={section} members={members} />;
            break;
          case "notices":
            node = <NoticesSection section={section} notices={notices} />;
            break;
          case "partners":
            node = <PartnersSection section={section} partners={partners} />;
            break;
          case "cta":
            node = <CtaSection section={section} />;
            break;
          case "custom":
            node = <CustomSection section={section} />;
            break;
        }
        return (
          <div key={section.id}>
            {anchor}
            {node}
          </div>
        );
      })}
    </div>
  );
}
