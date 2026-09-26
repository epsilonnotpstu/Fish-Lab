import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone, Printer } from "lucide-react";
import { asArray, getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { RichText } from "@/components/site/rich-text";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = { title: "Contact" };

function safeMapUrl(url: string) {
  try {
    const u = new URL(url);
    const ok = u.protocol === "https:" && ["www.google.com", "maps.google.com"].includes(u.hostname) && u.pathname.startsWith("/maps");
    return ok ? u.toString() : "";
  } catch {
    return "";
  }
}

export default async function ContactPage() {
  const s = await getSettings();
  const map = safeMapUrl(s.mapEmbedUrl);
  const cards = [
    s.address && { icon: MapPin, label: "Address", value: s.address },
    s.phone && { icon: Phone, label: "Phone", value: s.phone, href: `tel:${s.phone.replace(/[^\d+]/g, "")}` },
    s.email && { icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` },
    s.fax && { icon: Printer, label: "Fax", value: s.fax },
    s.officeHours && { icon: Clock, label: "Office hours", value: s.officeHours },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHeader eyebrow="Get in touch" title="Contact & access" subtitle={s.contactIntro} crumbs={[{ label: "Contact" }]} />
      <section className="section pt-12">
        <div className="container-page grid gap-12 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            {cards.map((c) => (
              <div key={c.label} className="flex gap-4 rounded-3xl border bg-card p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <c.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="mt-1 block font-medium break-words hover:text-brand dark:hover:text-brand-accent">{c.value}</a>
                  ) : (
                    <p className="mt-1 font-medium whitespace-pre-line">{c.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-7">
            {s.contactFormEnabled ? (
              <>
                <h2 className="mb-6 text-2xl font-bold">Send us a message</h2>
                <ContactForm types={asArray<string>(s.inquiryTypes).filter(Boolean)} />
              </>
            ) : (
              <div className="rounded-3xl border bg-card p-10 text-muted-foreground">Please reach us by email or phone.</div>
            )}
          </div>
        </div>
      </section>

      {(s.accessInfo || map) && (
        <section id="access" className="section bg-surface">
          <div className="container-page grid gap-12 lg:grid-cols-2">
            {s.accessInfo && (
              <div>
                <p className="eyebrow mb-4">Access</p>
                <h2 className="mb-6 text-3xl font-bold">How to find us</h2>
                <RichText html={s.accessInfo} />
              </div>
            )}
            {map && (
              <div className="min-h-[400px] overflow-hidden rounded-[2rem] border shadow-xl">
                <iframe
                  src={map}
                  title="Map"
                  className="h-full min-h-[400px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
