"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SocialIcon } from "./social-icon";

export function ShareButtons({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = (base: string) => {
    const url = encodeURIComponent(window.location.href);
    window.open(`${base}${url}&text=${encodeURIComponent(title)}`, "_blank", "noopener,noreferrer,width=600,height=500");
  };
  const btn = "grid size-9 place-items-center rounded-full border transition hover:bg-muted";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs">Share</span>
      <button type="button" className={btn} aria-label="Share on X" onClick={() => share("https://twitter.com/intent/tweet?url=")}>
        <SocialIcon platform="x" className="size-3.5" />
      </button>
      <button type="button" className={btn} aria-label="Share on LinkedIn" onClick={() => share("https://www.linkedin.com/sharing/share-offsite/?url=")}>
        <SocialIcon platform="linkedin" className="size-3.5" />
      </button>
      <button type="button" className={btn} aria-label="Share on Facebook" onClick={() => share("https://www.facebook.com/sharer/sharer.php?u=")}>
        <SocialIcon platform="facebook" className="size-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="Copy link"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-3.5 text-brand-accent" /> : <Link2 className="size-3.5" />}
      </button>
    </div>
  );
}
