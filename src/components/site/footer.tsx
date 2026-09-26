import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone, Printer, Clock } from "lucide-react";
import type { Settings, LinkItem, SocialItem } from "@/lib/settings";
import { asArray } from "@/lib/settings";
import { isSafeHref } from "@/lib/format";
import { LabLogo } from "./lab-logo";
import { SocialIcon, platformLabel } from "./social-icon";

export function Footer({
  settings,
  nav,
}: {
  settings: Settings;
  nav: { id: string; label: string; href: string }[];
}) {
  const socials = asArray<SocialItem>(settings.socials).filter((s) => s.url && isSafeHref(s.url));
  const links = asArray<LinkItem>(settings.footerLinks).filter((l) => l.url && isSafeHref(l.url));
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ocean relative mt-auto overflow-hidden text-white">
      <div className="bg-grid pointer-events-none absolute inset-0 text-white opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container-page relative grid gap-12 py-16 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <LabLogo brand={settings} light />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/65">{settings.footerAbout || settings.description}</p>
          {socials.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={platformLabel(s.platform)}
                  className="grid size-10 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-brand-accent hover:bg-brand-accent hover:text-accent-fg"
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Explore</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {nav.filter((n) => n.href !== "#").map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="text-white/65 transition hover:text-white">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {links.length > 0 && (
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Links</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {links.map((l) => (
                <li key={l.url + l.label}>
                  <a
                    href={l.url}
                    target={l.url.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-white/65 transition hover:text-white"
                  >
                    {l.label}
                    {l.url.startsWith("http") && <ArrowUpRight className="size-3 opacity-0 transition group-hover:opacity-100" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="lg:col-span-4">
          <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Contact</h3>
          <ul className="mt-5 space-y-4 text-sm text-white/65">
            {settings.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-accent" />
                <span className="whitespace-pre-line">{settings.address}</span>
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-accent" />
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">{settings.phone}</a>
              </li>
            )}
            {settings.fax && (
              <li className="flex gap-3">
                <Printer className="mt-0.5 size-4 shrink-0 text-brand-accent" />
                <span>Fax {settings.fax}</span>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-accent" />
                <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a>
              </li>
            )}
            {settings.officeHours && (
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-accent" />
                <span>{settings.officeHours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{settings.copyright || `© ${year} ${settings.labName}. All rights reserved.`}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{[settings.department, settings.faculty, settings.university].filter(Boolean).join(" · ")}</span>
            <Link href="/account" className="text-white/70 hover:text-white">Member portal</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
