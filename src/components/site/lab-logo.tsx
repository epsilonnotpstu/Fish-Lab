import { Fish } from "lucide-react";
import { cn } from "@/lib/utils";

export type Brand = {
  labName: string;
  shortName: string;
  university: string;
  faculty: string;
  logoUrl: string;
  logoDarkUrl: string;
};

/** Uploaded logo if there is one, otherwise a generated monogram mark. */
export function LabLogo({ brand, light = false, compact = false }: { brand: Brand; light?: boolean; compact?: boolean }) {
  const src = light ? brand.logoDarkUrl || brand.logoUrl : brand.logoUrl;
  return (
    <span className="flex items-center gap-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-10 w-auto max-w-[160px] object-contain" />
      ) : (
        <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-accent to-brand text-white shadow-lg shadow-brand-accent/20">
          <Fish className="size-5" strokeWidth={2.2} />
        </span>
      )}
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={cn("font-heading text-[15px] font-bold tracking-tight", light ? "text-white" : "text-foreground")}>
            {brand.shortName || brand.labName}
          </span>
          <span className={cn("max-w-[220px] truncate text-[11px] font-medium", light ? "text-white/65" : "text-muted-foreground")}>
            {brand.faculty || brand.university || brand.labName}
          </span>
        </span>
      )}
    </span>
  );
}
