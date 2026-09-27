import { Header, type NavLink } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { ceremonyArmed, ceremonyPending } from "@/lib/inauguration";
import { CeremonyGate } from "@/components/site/ceremony/ceremony-gate";
import { getNavigation, getSettings } from "@/lib/settings";
import { isSafeHref } from "@/lib/format";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Before the inauguration the public pages are replaced by the ceremony. The
  // chief guest (and staff) get the real site behind the curtain, so opening it
  // reveals the website itself; everyone else only gets the waiting screen.
  const pending = await ceremonyPending();
  let armedForCeremony = false;
  if (pending) {
    const [settings, search] = await Promise.all([
      getSettings(),
      headers().then((h) => h.get("x-search") ?? ""),
    ]);
    armedForCeremony = await ceremonyArmed(settings, new URLSearchParams(search).get("key") ?? "");
    if (!armedForCeremony) return <CeremonyGate armed={false} />;
  }

  const [settings, navRows, firstSection] = await Promise.all([
    getSettings(),
    getNavigation(),
    db.homeSection.findFirst({ where: { visible: true }, orderBy: { order: "asc" }, select: { type: true } }),
  ]);

  const nav: NavLink[] = navRows
    .filter((n) => isSafeHref(n.href))
    .map((n) => ({
      id: n.id,
      label: n.label,
      href: n.href,
      newTab: n.newTab,
      children: n.children
        .filter((c) => isSafeHref(c.href))
        .map((c) => ({ id: c.id, label: c.label, href: c.href, newTab: c.newTab })),
    }));

  const flatNav = nav.flatMap((n) => (n.children.length ? n.children : [n]));
  const showAnnouncement = settings.announcementEnabled && Boolean(settings.announcementText);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ResearchOrganization",
    name: settings.labName,
    alternateName: settings.shortName || undefined,
    description: settings.description || undefined,
    url: process.env.SITE_URL || undefined,
    logo: settings.logoUrl || undefined,
    email: settings.email || undefined,
    telephone: settings.phone || undefined,
    address: settings.address || undefined,
    parentOrganization: settings.university ? { "@type": "CollegeOrUniversity", name: settings.university, url: settings.universityUrl || undefined } : undefined,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2">
        Skip to content
      </a>
      {showAnnouncement && <AnnouncementBar text={settings.announcementText} url={isSafeHref(settings.announcementUrl) ? settings.announcementUrl : ""} />}
      <Header
        brand={{
          labName: settings.labName,
          shortName: settings.shortName,
          university: settings.university,
          faculty: settings.faculty,
          logoUrl: settings.logoUrl,
          logoDarkUrl: settings.logoDarkUrl,
        }}
        nav={nav}
        overlayOnHome={firstSection?.type === "hero"}
        hasAnnouncement={showAnnouncement}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} nav={flatNav} />
      {pending && <CeremonyGate armed={armedForCeremony} />}
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
