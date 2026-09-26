import { AlertTriangle, Info, Megaphone, Paperclip, Pin } from "lucide-react";
import type { Notice } from "@prisma/client";
import { formatDate, isSafeHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

const LEVELS = {
  info: { icon: Info, chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", label: "Notice" },
  important: { icon: Megaphone, chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", label: "Important" },
  urgent: { icon: AlertTriangle, chip: "bg-destructive/15 text-destructive", label: "Urgent" },
} as const;

export function NoticeCard({ notice, compact = false }: { notice: Notice; compact?: boolean }) {
  const level = LEVELS[(notice.level as keyof typeof LEVELS) ?? "info"] ?? LEVELS.info;
  const Icon = level.icon;
  return (
    <article id={notice.slug} className="scroll-mt-28 rounded-3xl border bg-card p-6 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase", level.chip)}>
          <Icon className="size-3.5" /> {level.label}
        </span>
        {notice.pinned && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase">
            <Pin className="size-3" /> Pinned
          </span>
        )}
        {notice.audience === "MEMBERS" && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
            Members only
          </span>
        )}
        <time className="ml-auto text-xs text-muted-foreground" dateTime={notice.publishAt.toISOString()}>
          {formatDate(notice.publishAt, "MMMM d, yyyy")}
        </time>
      </div>
      <h2 className={cn("mt-3 font-bold", compact ? "text-lg" : "text-xl sm:text-2xl")}>{notice.title}</h2>
      <RichText html={notice.body} className={cn("mt-3", compact && "prose-sm line-clamp-4")} />
      {notice.attachmentUrl && isSafeHref(notice.attachmentUrl) && (
        <a
          href={notice.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <Paperclip className="size-4" /> Attachment
        </a>
      )}
    </article>
  );
}
