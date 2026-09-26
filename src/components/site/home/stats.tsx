"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const match = value.match(/^(\D*)(\d[\d,]*)(.*)$/);
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const [display, setDisplay] = useState(Number.isNaN(target) ? value : `${match?.[1] ?? ""}0${match?.[3] ?? ""}`);

  useEffect(() => {
    if (!inView || Number.isNaN(target) || !match || reduce) return;
    const controls = animate(0, target, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(`${match[1]}${Math.round(v).toLocaleString()}${match[3]}`),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return <span ref={ref}>{reduce ? value : display}</span>;
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="relative z-10 -mt-6 pb-8 sm:-mt-10">
      <div className="container-page">
        <div className="grid grid-cols-2 overflow-hidden rounded-3xl border bg-card shadow-[0_30px_80px_-40px_color-mix(in_oklch,var(--brand)_45%,transparent)] lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={item.label + i}
              className="relative border-border p-6 text-center not-last:border-r max-lg:nth-2:border-r-0 max-lg:nth-[-n+2]:border-b sm:p-10"
            >
              <p className="font-heading text-4xl font-extrabold text-brand sm:text-5xl dark:text-brand-accent">
                <Counter value={item.value} />
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
