import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        status === "Ongoing" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        status === "Completed" && "bg-slate-500/15 text-slate-600 dark:text-slate-300",
        status === "Upcoming" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      )}
    >
      {status}
    </span>
  );
}
