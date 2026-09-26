import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  align = "left",
  invert = false,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: { label: string; href: string };
  align?: "left" | "center";
  invert?: boolean;
}) {
  if (!title && !eyebrow && !subtitle) return null;
  return (
    <Reveal
      className={cn(
        "mb-12 flex flex-col gap-6 sm:mb-16",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        {title && (
          <h2 className={cn("text-3xl font-bold sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]", invert ? "text-white" : "text-foreground")}>
            {title}
          </h2>
        )}
        {subtitle && (
          <p className={cn("mt-4 text-lg leading-relaxed", invert ? "text-white/70" : "text-muted-foreground")}>{subtitle}</p>
        )}
      </div>
      {action?.label && action.href && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 text-sm font-semibold",
            invert ? "text-white" : "text-brand dark:text-brand-accent",
          )}
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </Reveal>
  );
}
