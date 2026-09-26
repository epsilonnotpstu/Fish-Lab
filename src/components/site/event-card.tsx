import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { Event } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";

export function EventCard({ event, past = false }: { event: Event; past?: boolean }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn("group card-hover flex gap-5 overflow-hidden rounded-3xl border bg-card p-4 sm:p-5", past && "opacity-80")}
    >
      <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary py-4 text-primary-foreground">
        <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{formatDate(event.startDate, "MMM")}</span>
        <span className="font-heading text-3xl font-extrabold">{formatDate(event.startDate, "dd")}</span>
        <span className="text-[11px] opacity-70">{formatDate(event.startDate, "yyyy")}</span>
      </div>
      <div className="min-w-0 flex-1 py-1">
        <h3 className="font-bold transition group-hover:text-brand dark:group-hover:text-brand-accent">{event.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatDate(event.startDate, "h:mm a")}</span>
          {event.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {event.location}</span>}
        </div>
        {event.summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.summary}</p>}
      </div>
      {event.coverImage && (
        <div className="relative hidden w-40 shrink-0 overflow-hidden rounded-2xl md:block">
          <SmartImage src={event.coverImage} alt="" fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}
    </Link>
  );
}
