"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// A fixed, pleasant-looking waveform: real analysis is not worth the payload
// for short voice notes, and the bars still track playback position.
const BARS = [6, 10, 16, 12, 20, 26, 18, 24, 14, 22, 28, 18, 12, 20, 16, 10, 14, 22, 12, 8];

export function VoiceNote({ src, durationSec, mine }: { src: string; durationSec: number; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [length, setLength] = useState(durationSec);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const onTime = () => setProgress(el.duration ? el.currentTime / el.duration : 0);
    const onMeta = () => Number.isFinite(el.duration) && setLength(Math.round(el.duration));
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  };

  const seek = (index: number) => {
    const el = audio.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = (index / BARS.length) * el.duration;
  };

  const mmss = `${Math.floor(length / 60)}:${String(length % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-w-[13rem] items-center gap-3 py-1">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn("grid size-9 shrink-0 place-items-center rounded-full", mine ? "bg-white/20 text-white" : "bg-primary text-primary-foreground")}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <div className="flex flex-1 items-center gap-[3px]">
        {BARS.map((h, i) => (
          <button
            key={i}
            type="button"
            onClick={() => seek(i)}
            aria-label={`Seek to ${Math.round((i / BARS.length) * 100)}%`}
            className={cn(
              "w-[3px] rounded-full transition-colors",
              i / BARS.length <= progress
                ? mine ? "bg-white" : "bg-primary"
                : mine ? "bg-white/35" : "bg-muted-foreground/30",
            )}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className={cn("shrink-0 font-mono text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>{mmss}</span>
      <audio ref={audio} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
