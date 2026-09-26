import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SmartImage } from "./smart-image";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  image,
  crumbs = [],
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image?: string;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <section className="bg-ocean relative isolate overflow-hidden pt-36 pb-20 text-white sm:pt-44 sm:pb-28">
      {image && (
        <SmartImage src={image} alt="" fill loading="eager" sizes="100vw" className="-z-20 object-cover opacity-25 mix-blend-luminosity" />
      )}
      <div className="bg-grid absolute inset-0 -z-10 text-white opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="container-page">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-white/60">
          <Link href="/" className="transition hover:text-white">Home</Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5" />
              {c.href ? (
                <Link href={c.href} className="transition hover:text-white">{c.label}</Link>
              ) : (
                <span className="text-white/90">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="max-w-4xl text-4xl font-bold sm:text-5xl lg:text-6xl lg:leading-[1.05]">{title}</h1>
        {subtitle && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{subtitle}</p>}
      </div>
      <Wave />
    </section>
  );
}

export function Wave({ className = "text-background" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-x-0 -bottom-px h-12 w-full sm:h-16 ${className}`}
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0,48 C180,80 360,80 540,56 C720,32 900,0 1080,8 C1260,16 1350,40 1440,48 L1440,80 L0,80 Z"
      />
    </svg>
  );
}
