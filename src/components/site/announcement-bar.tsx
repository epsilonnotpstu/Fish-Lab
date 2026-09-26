import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

export function AnnouncementBar({ text, url }: { text: string; url: string }) {
  const content = (
    <span className="flex items-center justify-center gap-2 truncate">
      <Megaphone className="size-3.5 shrink-0" />
      <span className="truncate">{text}</span>
      {url && <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />}
    </span>
  );
  return (
    <div className="relative z-[60] h-10 bg-brand-accent text-accent-fg">
      <div className="container-page flex h-full items-center justify-center text-[13px] font-medium">
        {url ? (
          <Link href={url} className="group min-w-0 hover:underline">{content}</Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
