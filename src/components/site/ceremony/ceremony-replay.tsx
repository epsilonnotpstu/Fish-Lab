"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import type { CeremonyContent } from "@/lib/inauguration";
import { CeremonyScreen } from "./ceremony-screen";

/** Plays the ceremony again for the record; nothing is written. */
export function CeremonyReplay({ content }: { content: CeremonyContent }) {
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        <PlayCircle className="size-4" /> Replay the ceremony
      </button>
      {playing && (
        <div className="fixed inset-0 z-[100]">
          <CeremonyScreen content={content} armed ceremonyKey="" replay />
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className="absolute top-5 right-5 z-[101] rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white backdrop-blur"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
