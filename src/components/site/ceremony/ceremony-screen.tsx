"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Scissors, Sparkles } from "lucide-react";
import type { CeremonyContent } from "@/lib/inauguration";
import { inaugurate } from "@/actions/inauguration";
import { cn } from "@/lib/utils";

type Phase = "idle" | "cutting" | "opening" | "plaque" | "done";

const GOLD = "#e3b23c";
const GOLD_SOFT = "#f6dd9b";
const GOLD_DEEP = "#8a6512";
const SATIN = `linear-gradient(180deg, ${GOLD_DEEP} 0%, ${GOLD} 28%, #fbe9b7 47%, ${GOLD} 64%, ${GOLD_DEEP} 100%)`;
const GOLD_TEXT = {
  backgroundImage: `linear-gradient(180deg, #fff3cf 0%, ${GOLD_SOFT} 45%, ${GOLD} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

/** Deterministic scatter, so the pieces look random but never re-shuffle. */
function scatter(i: number, salt: number) {
  const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** One laurel branch along the left half of a circle: pairs of leaves sprouting from a stem. */
const STEM_R = 48;
const rad = (deg: number) => (deg * Math.PI) / 180;
const onStem = (deg: number) => [60 + STEM_R * Math.cos(rad(deg)), 60 + STEM_R * Math.sin(rad(deg))] as const;
const LAUREL_STEM = (() => {
  const [x1, y1] = onStem(100);
  const [x2, y2] = onStem(232);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${STEM_R} ${STEM_R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
})();
const LAUREL_LEAVES = Array.from({ length: 7 }, (_, i) => i).flatMap((i) => {
  const deg = 106 + i * 18;
  const [bx, by] = onStem(deg);
  // Direction of growth along the stem (clockwise on screen, bottom → top).
  const tangent = Math.atan2(Math.cos(rad(deg)), -Math.sin(rad(deg))) * (180 / Math.PI);
  const rx = 8.6 - i * 0.45;
  return [-1, 1].map((side) => {
    // side -1 leans outward, +1 leans in towards the seal.
    const angle = tangent + side * 34;
    return {
      x: bx + rx * 0.85 * Math.cos(rad(angle)),
      y: by + rx * 0.85 * Math.sin(rad(angle)),
      rotate: angle,
      rx,
      light: side < 0,
    };
  });
});

function Laurel({ className }: { className?: string }) {
  const branch = (
    <>
      <path d={LAUREL_STEM} fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.8" />
      {LAUREL_LEAVES.map((l, i) => (
        <ellipse
          key={i}
          cx={l.x.toFixed(2)}
          cy={l.y.toFixed(2)}
          rx={l.rx.toFixed(2)}
          ry="3"
          transform={`rotate(${l.rotate.toFixed(1)} ${l.x.toFixed(2)} ${l.y.toFixed(2)})`}
          fill={l.light ? GOLD_SOFT : GOLD}
        />
      ))}
    </>
  );
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {branch}
      <g transform="translate(120 0) scale(-1 1)">{branch}</g>
    </svg>
  );
}

/** The lab's seal inside a laurel wreath. */
function Seal({ content }: { content: CeremonyContent }) {
  return (
    <div className="relative mx-auto mb-5 grid size-24 place-items-center sm:size-28">
      <Laurel className="absolute inset-0 size-full" />
      <div
        className="grid size-14 place-items-center rounded-full sm:size-16"
        style={{
          background: "radial-gradient(circle at 35% 30%, #12476b, #061b2b 75%)",
          boxShadow: `0 0 0 1px ${GOLD}, 0 0 0 4px rgba(227,178,60,0.14), 0 10px 30px -10px rgba(227,178,60,0.6)`,
        }}
      >
        {content.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content.logo} alt="" className="size-9 object-contain sm:size-10" />
        ) : (
          <span className="font-heading text-sm font-extrabold tracking-[0.12em]" style={GOLD_TEXT}>
            {content.shortName}
          </span>
        )}
      </div>
    </div>
  );
}

/** A thin gold rule with a diamond in the middle. */
function Flourish({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto flex w-44 items-center gap-2.5", className)} aria-hidden>
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
      <span className="size-1 rotate-45" style={{ backgroundColor: GOLD_SOFT }} />
      <span className="size-1.5 rotate-45" style={{ backgroundColor: GOLD }} />
      <span className="size-1 rotate-45" style={{ backgroundColor: GOLD_SOFT }} />
      <span className="h-px flex-1" style={{ background: `linear-gradient(270deg, transparent, ${GOLD})` }} />
    </div>
  );
}

/** Engraved corner ornaments for the inner frame of a card. */
function Corners() {
  const spots = ["top-3 left-3", "top-3 right-3 -scale-x-100", "bottom-3 left-3 -scale-y-100", "bottom-3 right-3 rotate-180"];
  return (
    <>
      {spots.map((spot) => (
        <svg key={spot} viewBox="0 0 28 28" className={cn("pointer-events-none absolute size-7", spot)} aria-hidden>
          <path d="M1 27 V10 Q1 1 10 1 H27" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.75" />
          <path d="M6 27 V12 Q6 6 12 6 H27" fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.4" />
          <rect x="8.5" y="8.5" width="3" height="3" transform="rotate(45 10 10)" fill={GOLD_SOFT} />
        </svg>
      ))}
    </>
  );
}

/** A satin bow for the middle of the ribbon. */
function Bow({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 104 64" className="h-14 w-24 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]" aria-hidden>
      <defs>
        <linearGradient id={`${id}-satin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe9b7" />
          <stop offset="0.45" stopColor={GOLD} />
          <stop offset="1" stopColor={GOLD_DEEP} />
        </linearGradient>
      </defs>
      {/* tails */}
      <path d="M47 34 L34 62 L40 58 L44 63 L52 36 Z" fill={`url(#${id}-satin)`} />
      <path d="M57 34 L70 62 L64 58 L60 63 L52 36 Z" fill={`url(#${id}-satin)`} />
      {/* loops */}
      <path d="M52 30 C38 6 10 6 10 22 C10 38 36 40 52 30 Z" fill={`url(#${id}-satin)`} />
      <path d="M52 30 C66 6 94 6 94 22 C94 38 68 40 52 30 Z" fill={`url(#${id}-satin)`} />
      <path d="M48 29 C36 16 20 14 18 22" fill="none" stroke={GOLD_DEEP} strokeWidth="1.2" opacity="0.6" />
      <path d="M56 29 C68 16 84 14 86 22" fill="none" stroke={GOLD_DEEP} strokeWidth="1.2" opacity="0.6" />
      {/* knot */}
      <rect x="45" y="22" width="14" height="16" rx="4" fill={`url(#${id}-satin)`} stroke={GOLD_DEEP} strokeWidth="0.8" />
    </svg>
  );
}

/** A soft stage light, drifting glows and a few rising motes of gold. */
function Backdrop({ still }: { still: boolean }) {
  const motes = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: 8 + scatter(i, 11) * 84,
        size: 2 + scatter(i, 12) * 3,
        duration: 10 + scatter(i, 13) * 8,
        delay: scatter(i, 14) * 8,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 42% 80% at 50% -8%, rgba(246,221,155,0.16), transparent 70%)" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,10,18,0.6) 100%)" }} />
      {!still && (
        <>
          <motion.div
            className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-accent/20 blur-[120px]"
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-40 -bottom-40 size-[38rem] rounded-full blur-[130px]"
            style={{ backgroundColor: "rgba(227,178,60,0.16)" }}
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          {motes.map((m) => (
            <motion.span
              key={m.id}
              className="absolute bottom-0 block rounded-full"
              style={{ left: `${m.x}%`, width: m.size, height: m.size, backgroundColor: GOLD_SOFT, boxShadow: `0 0 8px ${GOLD}` }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: "-100vh", opacity: [0, 0.8, 0.8, 0] }}
              transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** Gold and white pieces that drift down once the ribbon is cut. */
function Confetti({ run }: { run: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        id: i,
        x: scatter(i, 1) * 100,
        delay: scatter(i, 2) * 0.8,
        duration: 2.6 + scatter(i, 3) * 2.4,
        size: 5 + scatter(i, 4) * 8,
        rotate: scatter(i, 5) * 360,
        sway: (scatter(i, 6) - 0.5) * 120,
        gold: i % 3 !== 0,
        streamer: i % 5 === 0,
      })),
    [],
  );
  if (!run) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-8%] block rounded-[2px]"
          style={{
            left: `${p.x}%`,
            width: p.streamer ? 3 : p.size,
            height: p.streamer ? p.size * 2.6 : p.size * 0.42,
            background: p.gold ? SATIN : "#ffffff",
            opacity: p.gold ? 0.95 : 0.7,
          }}
          initial={{ y: 0, x: 0, rotate: p.rotate, opacity: 0 }}
          animate={{ y: "110vh", x: p.sway, rotate: p.rotate + 420, opacity: [0, 1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

export function CeremonyScreen({
  content,
  armed,
  ceremonyKey,
  alreadyDone,
  replay = false,
}: {
  content: CeremonyContent;
  armed: boolean;
  ceremonyKey: string;
  alreadyDone?: string | null;
  /** Replay mode never records anything — it just plays the ceremony again. */
  replay?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const svgId = useId().replace(/:/g, "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setPhase("cutting");

    if (!replay) {
      const res = await inaugurate(ceremonyKey);
      if (!res.ok) {
        setError(res.error ?? "Could not complete the ceremony.");
        setPhase("idle");
        return;
      }
    }

    const beat = reduce ? 200 : 1300;
    setTimeout(() => setPhase("opening"), beat);
    setTimeout(() => setPhase("plaque"), beat + (reduce ? 300 : 1500));
    setTimeout(() => {
      setPhase("done");
      // Reveal the real site behind the curtain.
      if (!replay) router.refresh();
    }, beat + (reduce ? 900 : 4200));
  };

  // After a replay, put the screen back so it can be shown again.
  useEffect(() => {
    if (replay && phase === "done") {
      const t = setTimeout(() => setPhase("idle"), 1200);
      return () => clearTimeout(t);
    }
  }, [replay, phase]);

  const cutting = phase === "cutting";
  const opened = phase === "opening" || phase === "plaque" || phase === "done";
  const fast = Boolean(reduce);

  return (
    <div className={cn("fixed inset-0 z-[100] overflow-hidden text-white", phase === "done" && !replay && "pointer-events-none")}>
      {/* Velvet curtain halves — mirrored, so the join in the middle reads as a real seam */}
      {(["left", "right"] as const).map((side) => (
        <motion.div
          key={side}
          className={cn("absolute inset-y-0 z-0 w-[50.5%] overflow-hidden", side === "left" ? "left-0" : "right-0")}
          initial={false}
          animate={{
            x: opened ? (side === "left" ? ["0%", "1.5%", "-102%"] : ["0%", "-1.5%", "102%"]) : "0%",
          }}
          transition={{ duration: fast ? 0.35 : 1.9, times: opened ? [0, 0.14, 1] : undefined, ease: [0.76, 0, 0.24, 1] }}
        >
          <div
            className={cn("absolute inset-0", side === "right" && "-scale-x-100")}
            style={{
              backgroundImage: [
                "linear-gradient(180deg, rgba(0,0,0,0.45), transparent 20%, transparent 72%, rgba(0,0,0,0.55))",
                "repeating-linear-gradient(90deg, rgba(0,0,0,0.34) 0px, rgba(255,255,255,0.07) 26px, rgba(0,0,0,0.26) 50px, rgba(255,255,255,0.05) 70px, rgba(0,0,0,0.34) 92px)",
                "linear-gradient(90deg, #03111b 0%, #072739 50%, #0b3b5c 100%)",
              ].join(", "),
            }}
          />
          {/* Gold trim along the opening edge */}
          <div
            className={cn("absolute inset-y-0 w-[3px]", side === "left" ? "right-0" : "left-0")}
            style={{ background: `linear-gradient(180deg, ${GOLD_DEEP}, ${GOLD} 30%, ${GOLD_SOFT} 50%, ${GOLD} 70%, ${GOLD_DEEP})`, opacity: 0.8 }}
          />
        </motion.div>
      ))}

      {/* Ambience sits above the curtain so both halves read as one stage */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        initial={false}
        animate={{ opacity: opened ? 0 : 1 }}
        transition={{ duration: fast ? 0.2 : 0.8 }}
      >
        <Backdrop still={fast} />
      </motion.div>

      {/* Valance with a gold fringe across the top of the stage */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-[15]"
        initial={false}
        animate={{ y: opened ? "-110%" : "0%" }}
        transition={{ duration: fast ? 0.3 : 1.2, delay: opened && !fast ? 0.5 : 0, ease: [0.76, 0, 0.24, 1] }}
        aria-hidden
      >
        <div
          className="h-7 sm:h-10"
          style={{
            backgroundImage: [
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.3) 0 3px, transparent 3px 36px)",
              "linear-gradient(180deg, #020c14, #082a41)",
            ].join(", "),
          }}
        />
        <div className="h-[3px]" style={{ background: SATIN.replace("180deg", "90deg") }} />
        <div
          className="h-2.5 opacity-70"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${GOLD} 0 1px, transparent 1px 5px)`,
            maskImage: "linear-gradient(180deg, black, transparent)",
          }}
        />
      </motion.div>

      {/* Card with the invitation and the ribbon */}
      <AnimatePresence>
        {!opened && (
          <motion.div
            className="absolute inset-0 z-20 overflow-y-auto"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.4 } }}
            transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div className="grid min-h-full place-items-center px-5 pt-14 pb-8 sm:pt-16">
              <div className="relative w-full max-w-2xl">
                <div
                  className="relative overflow-hidden rounded-[2rem] border px-6 py-9 text-center backdrop-blur-xl sm:px-12 sm:py-11"
                  style={{
                    borderColor: "rgba(227,178,60,0.3)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
                    boxShadow: "0 40px 120px -40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.14)",
                  }}
                >
                  <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border" style={{ borderColor: "rgba(227,178,60,0.14)" }} />
                  <Corners />

                  <Seal content={content} />

                  <p className="flex items-center justify-center gap-3 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs" style={{ color: GOLD_SOFT }}>
                    <span className="hidden h-px w-8 sm:block" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
                    Inauguration Ceremony
                    <span className="hidden h-px w-8 sm:block" style={{ background: `linear-gradient(270deg, transparent, ${GOLD})` }} />
                  </p>

                  <h1
                    className="mt-4 font-heading text-3xl leading-tight font-extrabold sm:text-5xl"
                    style={{ backgroundImage: "linear-gradient(180deg, #ffffff 40%, #f3e6c4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
                  >
                    {content.labName}
                  </h1>
                  {content.title && <p className="mt-3 text-base text-white/75 sm:text-lg">{content.title}</p>}

                  <Flourish className="my-7" />

                  {content.guestName && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] tracking-[0.24em] text-white/50 uppercase">Inaugurated by</p>
                      <p className="font-heading text-xl font-bold sm:text-2xl" style={GOLD_TEXT}>
                        {content.guestName}
                      </p>
                      {content.guestTitle && <p className="text-sm text-white/70">{content.guestTitle}</p>}
                    </div>
                  )}

                  {content.date && (
                    <p className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/70">
                      <span className="size-1 rotate-45" style={{ backgroundColor: GOLD }} />
                      {content.date}
                      <span className="size-1 rotate-45" style={{ backgroundColor: GOLD }} />
                    </p>
                  )}

                  {/* The ribbon runs edge to edge across the card, tied with a bow */}
                  <div className="relative -mx-6 mt-8 h-16 sm:-mx-12">
                    {(["left", "right"] as const).map((side) => (
                      <motion.span
                        key={side}
                        className={cn("absolute top-1/2 h-3.5 w-1/2 -translate-y-1/2", side === "left" ? "left-0 origin-right" : "right-0 origin-left")}
                        style={{ background: SATIN, boxShadow: "0 8px 20px -8px rgba(0,0,0,0.7), 0 0 18px -6px rgba(227,178,60,0.7)" }}
                        animate={
                          cutting
                            ? { x: side === "left" ? -60 : 60, rotate: side === "left" ? -18 : 18, y: 120, opacity: 0 }
                            : { x: 0, rotate: 0, y: 0, opacity: 1 }
                        }
                        transition={{ duration: fast ? 0.2 : 0.9, delay: cutting && !fast ? 0.5 : 0, ease: [0.55, 0, 0.85, 0.35] }}
                      />
                    ))}

                    <motion.div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%]"
                      animate={cutting ? { y: 140, rotate: 24, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
                      transition={{ duration: fast ? 0.2 : 0.9, delay: cutting && !fast ? 0.5 : 0, ease: [0.55, 0, 0.85, 0.35] }}
                    >
                      <Bow id={svgId} />
                    </motion.div>

                    {/* The flash where the scissors meet the ribbon */}
                    <motion.span
                      className="pointer-events-none absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ background: `radial-gradient(circle, ${GOLD_SOFT}, rgba(227,178,60,0.35) 40%, transparent 70%)` }}
                      initial={false}
                      animate={cutting ? { scale: [0.2, 2.6], opacity: [0, 0.9, 0] } : { scale: 0.2, opacity: 0 }}
                      transition={{ duration: fast ? 0.2 : 0.8, delay: cutting && !fast ? 0.45 : 0 }}
                      aria-hidden
                    />

                    <motion.span
                      className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#082a41]/80 backdrop-blur"
                      initial={false}
                      animate={
                        cutting
                          ? { x: [140, 0, 0, 0], rotate: [0, 0, -24, 0], scale: [0.9, 1, 1.12, 1], opacity: [0, 1, 1, 0] }
                          : { x: 140, rotate: 0, scale: 0.9, opacity: 0 }
                      }
                      transition={{ duration: fast ? 0.2 : 1.1, times: [0, 0.38, 0.52, 1] }}
                      aria-hidden
                    >
                      <Scissors className="size-5" style={{ color: GOLD_SOFT }} />
                    </motion.span>
                  </div>

                  {armed ? (
                    <div className="relative mt-7 inline-flex">
                      {phase === "idle" && !fast && (
                        <motion.span
                          className="pointer-events-none absolute inset-0 rounded-full"
                          style={{ boxShadow: `0 0 0 1px ${GOLD}` }}
                          animate={{ scale: [1, 1.12], opacity: [0.7, 0] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                          aria-hidden
                        />
                      )}
                      <button
                        type="button"
                        onClick={run}
                        disabled={phase !== "idle"}
                        className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-10 text-base font-bold text-[#231a06] transition hover:-translate-y-0.5 disabled:opacity-80"
                        style={{
                          background: `linear-gradient(120deg, ${GOLD_SOFT}, ${GOLD} 60%, #c9951f)`,
                          boxShadow: "0 18px 40px -18px rgba(227,178,60,0.9), inset 0 1px 0 rgba(255,255,255,0.6)",
                        }}
                      >
                        <span className="absolute inset-0 -translate-x-full bg-white/40 [mask-image:linear-gradient(90deg,transparent,black,transparent)] transition-transform duration-700 group-hover:translate-x-full" />
                        {phase === "idle" ? <Sparkles className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
                        {content.buttonLabel}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm text-white/70">
                      <span className="size-2 animate-pulse rounded-full" style={{ backgroundColor: GOLD }} />
                      Launching soon — the website opens at the ceremony
                    </p>
                  )}

                  {content.note && <p className="mt-5 text-xs text-white/50">{content.note}</p>}
                  {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
                </div>

                <p className="mt-6 text-center text-xs text-white/45">
                  {[content.department, content.university].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-30">
        <Confetti run={phase === "opening" || phase === "plaque"} />
      </div>

      {/* Commemorative plaque */}
      <AnimatePresence>
        {phase === "plaque" && (
          <motion.div
            className="absolute inset-0 z-30 grid place-items-center px-6"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div
              className="relative max-w-lg overflow-hidden rounded-3xl border px-8 py-9 text-center backdrop-blur-xl sm:px-14"
              style={{
                borderColor: "rgba(227,178,60,0.5)",
                background: "linear-gradient(180deg, rgba(10,38,58,0.9), rgba(4,20,31,0.88))",
                boxShadow: "0 40px 100px -30px rgba(0,0,0,0.8), 0 0 60px -20px rgba(227,178,60,0.45)",
              }}
            >
              <div className="pointer-events-none absolute inset-3 rounded-[1.1rem] border" style={{ borderColor: "rgba(227,178,60,0.18)" }} />
              <Corners />
              <Laurel className="mx-auto mb-3 size-20" />
              <p className="text-xs font-semibold tracking-[0.34em] uppercase" style={{ color: GOLD }}>
                Inaugurated
              </p>
              <p className="mt-3 font-heading text-2xl font-extrabold sm:text-3xl">{content.labName}</p>
              <Flourish className="my-5 w-32" />
              {content.guestName && (
                <p className="text-sm text-white/75">
                  by <span className="font-semibold" style={GOLD_TEXT}>{content.guestName}</span>
                  {content.guestTitle ? `, ${content.guestTitle}` : ""}
                </p>
              )}
              {content.date && <p className="mt-2 text-sm text-white/60">{content.date}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {alreadyDone && phase === "idle" && !replay && (
        <p className="absolute inset-x-0 bottom-6 z-20 text-center text-xs text-white/50">
          This website was inaugurated on {alreadyDone}.
        </p>
      )}
    </div>
  );
}
