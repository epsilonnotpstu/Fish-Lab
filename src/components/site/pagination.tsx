import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (p: number) => string;
}) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );
  return (
    <nav className="mt-14 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn("grid size-10 place-items-center rounded-full border transition hover:bg-muted", page === 1 && "pointer-events-none opacity-40")}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Link>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={hrefFor(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              "grid size-10 place-items-center rounded-full text-sm font-medium transition",
              n === page ? "bg-primary text-primary-foreground" : "border hover:bg-muted",
            )}
          >
            {n}
          </Link>
        </span>
      ))}
      <Link
        href={hrefFor(Math.min(pages, page + 1))}
        aria-disabled={page === pages}
        className={cn("grid size-10 place-items-center rounded-full border transition hover:bg-muted", page === pages && "pointer-events-none opacity-40")}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
