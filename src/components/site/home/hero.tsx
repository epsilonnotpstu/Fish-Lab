"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { SmartImage } from "../smart-image";
import { Wave } from "../page-header";

export type HeroSlide = { image: string; title: string; subtitle: string };

export function Hero({
  slides,
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
}: {
  slides: HeroSlide[];
  eyebrow?: string;
  title: string;
  subtitle: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(t);
  }, [count, reduce]);

  const slide = slides[index];
  const heading = slide?.title || title;
  const sub = slide?.subtitle || subtitle;

  return (
    <section className="relative isolate flex min-h-[640px] items-center overflow-hidden bg-ink text-white h-[100svh] max-h-[1000px]">
      <AnimatePresence initial={false}>
        {slide?.image && (
          <motion.div
            key={index}
            className="absolute inset-0 -z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduce ? 0 : 8, ease: "linear" }}
            >
              <SmartImage src={slide.image} alt="" fill loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} sizes="100vw" className="object-cover" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,color-mix(in_oklch,var(--ink)_92%,transparent)_0%,color-mix(in_oklch,var(--ink)_65%,transparent)_45%,color-mix(in_oklch,var(--ink)_15%,transparent)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-transparent to-ink/40" />

      <div className="container-page w-full pt-24">
        <div className="max-w-3xl">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-brand-accent" />
              {eyebrow}
            </motion.p>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={heading + sub}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-6xl lg:text-7xl">{heading}</h1>
              {sub && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">{sub}</p>}
            </motion.div>
          </AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            {primary?.label && primary.href && (
              <Link
                href={primary.href}
                className="group inline-flex items-center gap-2 rounded-full bg-brand-accent px-7 py-3.5 text-sm font-semibold text-accent-fg shadow-lg shadow-brand-accent/25 transition hover:brightness-110"
              >
                {primary.label}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
            {secondary?.label && secondary.href && (
              <Link
                href={secondary.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                {secondary.label}
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      {count > 1 && (
        <div className="absolute right-4 bottom-24 flex gap-2 sm:right-8 lg:right-12">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className="group relative h-1.5 w-10 overflow-hidden rounded-full bg-white/25"
            >
              {i === index && (
                <motion.span
                  key={`bar-${index}`}
                  className="absolute inset-y-0 left-0 bg-white"
                  initial={{ width: reduce ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: reduce ? 0 : 6.5, ease: "linear" }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <a
        href="#content"
        aria-label="Scroll down"
        className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 animate-float text-white/60 transition hover:text-white sm:block"
      >
        <ChevronDown className="size-6" />
      </a>
      <Wave />
    </section>
  );
}
