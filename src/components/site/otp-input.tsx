"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Six single-digit boxes that submit as one hidden `name` field. Supports paste. */
export function OtpInput({ name, autoFocus, className }: { name: string; autoFocus?: boolean; className?: string }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, v: string) => {
    const next = [...digits];
    next[i] = v;
    setDigits(next);
  };

  return (
    <div className={cn("flex justify-between gap-2", className)}>
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className="h-14 w-full min-w-0 rounded-xl border bg-background text-center font-mono text-2xl font-bold outline-none transition focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/20"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) return setAt(i, "");
            setAt(i, v[v.length - 1]);
            refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i]) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft") refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!text) return;
            e.preventDefault();
            const next = Array(6).fill("").map((_, j) => text[j] ?? "");
            setDigits(next);
            refs.current[Math.min(text.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
