"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Scissors, Sparkles } from "lucide-react";
import type { CeremonyContent } from "@/lib/inauguration";
import { inaugurate } from "@/actions/inauguration";
import { cn } from "@/lib/utils";

type Phase = "idle" | "cutting" | "opening" | "plaque" | "done";

const GOLD = "#e3b23c";
const GOLD_SOFT = "#f6dd9b";

/** Slow drifting light behind the card — calm, not flashy. */
function Backdrop({ still }: { still: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="bg-grid absolute inset-0 text-white opacity-[0.10]" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,10,18,0.55) 100%)" }} />
      {!still && (
        <>
          <motion.div
            className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-accent/25 blur-[120px]"
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-40 -bottom-40 size-[38rem] rounded-full blur-[130px]"
            style={{ backgroundColor: "rgba(227,178,60,0.18)" }}
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}

/** Deterministic scatter, so the pieces look random but never re-shuffle. */
function scatter(i: number, salt: number) {
  const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Gold dust that drifts down once the ribbon is cut. */
function Confetti({ run }: { run: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        x: scatter(i, 1) * 100,
        delay: scatter(i, 2) * 0.8,
        duration: 2.6 + scatter(i, 3) * 2.4,
        size: 5 + scatter(i, 4) * 8,
        rotate: scatter(i, 5) * 360,
        gold: i % 3 !== 0,
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
            width: p.size,
            height: p.size * 0.42,
            backgroundColor: p.gold ? GOLD : "#ffffff",
            opacity: p.gold ? 0.95 : 0.7,
          }}
          initial={{ y: 0, rotate: p.rotate, opacity: 0 }}
          animate={{ y: "110vh", rotate: p.rotate + 420, opacity: [0, 1, 1, 0] }}
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

    const beat = reduce ? 200 : 1100;
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

  const opened = phase === "opening" || phase === "plaque" || phase === "done";

  return (
    <div className={cn("fixed inset-0 z-[100] overflow-hidden text-white", phase === "done" && !replay && "pointer-events-none")}>
      {/* Curtain halves — symmetric velvet, so the join in the middle is invisible */}
      {(["left", "right"] as const).map((side) => (
        <motion.div
          key={side}
          className={cn("absolute inset-y-0 z-0 w-[50.5%] overflow-hidden", side === "left" ? "left-0" : "right-0")}
          initial={false}
          animate={{ x: opened ? (side === "left" ? "-102%" : "102%") : "0%" }}
          transition={{ duration: reduce ? 0.35 : 1.7, ease: [0.76, 0, 0.24, 1] }}
          style={{
            background:
              side === "left"
                ? "linear-gradient(90deg, #04141f 0%, #082a41 55%, #0b3b5c 100%)"
                : "linear-gradient(270deg, #04141f 0%, #082a41 55%, #0b3b5c 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-25 mix-blend-soft-light"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 2px, rgba(0,0,0,0.3) 2px 58px)",
            }}
          />
          {/* Gold trim along the opening edge */}
          <div
            className={cn("absolute inset-y-0 w-[3px]", side === "left" ? "right-0" : "left-0")}
            style={{ background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`, opacity: 0.7 }}
          />
        </motion.div>
      ))}

      {/* Ambience sits above the curtain so both halves read as one backdrop */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        initial={false}
        animate={{ opacity: opened ? 0 : 1 }}
        transition={{ duration: reduce ? 0.2 : 0.8 }}
      >
        <Backdrop still={Boolean(reduce)} />
      </motion.div>

      {/* Card with the invitation and the ribbon */}
      <AnimatePresence>
        {!opened && (
          <motion.div
            className="absolute inset-0 z-20 grid place-items-center px-5"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.4 } }}
            transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div className="relative w-full max-w-2xl">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.06] px-6 py-10 text-center backdrop-blur-xl sm:px-12 sm:py-14">
                <p className="eyebrow mb-5 justify-center" style={{ color: GOLD_SOFT }}>
                  Inauguration Ceremony
                </p>

                {content.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={content.logo} alt="" className="mx-auto mb-6 h-14 w-auto object-contain" />
                ) : (
                  <p className="mb-4 font-heading text-sm tracking-[0.3em] text-white/60 uppercase">{content.shortName}</p>
                )}

                <h1 className="font-heading text-3xl leading-tight font-extrabold sm:text-5xl">{content.labName}</h1>
                {content.title && <p className="mt-4 text-base text-white/75 sm:text-lg">{content.title}</p>}

                <div className="mx-auto my-8 h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

                {content.guestName && (
                  <div className="space-y-1">
                    <p className="text-xs tracking-[0.2em] text-white/50 uppercase">Inaugurated by</p>
                    <p className="font-heading text-xl font-bold sm:text-2xl" style={{ color: GOLD_SOFT }}>
                      {content.guestName}
                    </p>
                    {content.guestTitle && <p className="text-sm text-white/70">{content.guestTitle}</p>}
                  </div>
                )}

                {content.date && <p className="mt-5 text-sm text-white/60">{content.date}</p>}

                {/* The ribbon */}
                <div className="relative mt-10 h-16">
                  <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                    {(["left", "right"] as const).map((side) => (
                      <motion.span
                        key={side}
                        className={cn("h-3 w-1/2 origin-center", side === "left" ? "rounded-l-full" : "rounded-r-full")}
                        style={{
                          background:
                            side === "left"
                              ? `linear-gradient(90deg, rgba(227,178,60,0.35), ${GOLD})`
                              : `linear-gradient(270deg, rgba(227,178,60,0.35), ${GOLD})`,
                          boxShadow: "0 6px 24px -8px rgba(227,178,60,0.8)",
                        }}
                        animate={
                          phase === "cutting"
                            ? { x: side === "left" ? -90 : 90, rotate: side === "left" ? -14 : 14, y: 60, opacity: 0 }
                            : { x: 0, rotate: 0, y: 0, opacity: 1 }
                        }
                        transition={{ duration: reduce ? 0.2 : 0.9, ease: [0.33, 1, 0.68, 1] }}
                      />
                    ))}
                  </div>

                  <motion.span
                    className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur"
                    animate={
                      phase === "cutting"
                        ? { rotate: [0, -25, 12, 0], scale: [1, 1.15, 1], opacity: [1, 1, 0] }
                        : { rotate: 0, scale: 1, opacity: 1 }
                    }
                    transition={{ duration: reduce ? 0.2 : 0.9 }}
                    aria-hidden
                  >
                    <Scissors className="size-5" style={{ color: GOLD_SOFT }} />
                  </motion.span>
                </div>

                {armed ? (
                  <button
                    type="button"
                    onClick={run}
                    disabled={phase !== "idle"}
                    className="group relative mt-8 inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-10 text-base font-bold text-[#231a06] transition disabled:opacity-80"
                    style={{ background: `linear-gradient(120deg, ${GOLD_SOFT}, ${GOLD})`, boxShadow: "0 18px 40px -18px rgba(227,178,60,0.9)" }}
                  >
                    <span className="absolute inset-0 -translate-x-full bg-white/40 [mask-image:linear-gradient(90deg,transparent,black,transparent)] transition-transform duration-700 group-hover:translate-x-full" />
                    {phase === "idle" ? <Sparkles className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
                    {content.buttonLabel}
                  </button>
                ) : (
                  <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm text-white/70">
                    <span className="size-2 animate-pulse rounded-full" style={{ backgroundColor: GOLD }} />
                    Launching soon — the website opens at the ceremony
                  </p>
                )}

                {content.note && <p className="mt-6 text-xs text-white/50">{content.note}</p>}
                {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
              </div>

              <p className="mt-6 text-center text-xs text-white/45">
                {[content.department, content.university].filter(Boolean).join(" · ")}
              </p>
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
              className="rounded-3xl border px-8 py-10 text-center backdrop-blur-xl sm:px-14"
              style={{ borderColor: "rgba(227,178,60,0.45)", background: "rgba(8,26,40,0.72)" }}
            >
              <p className="text-xs tracking-[0.3em] uppercase" style={{ color: GOLD }}>
                Inaugurated
              </p>
              <p className="mt-4 font-heading text-2xl font-extrabold sm:text-3xl">{content.labName}</p>
              {content.guestName && (
                <p className="mt-4 text-sm text-white/75">
                  by <span className="font-semibold" style={{ color: GOLD_SOFT }}>{content.guestName}</span>
                  {content.guestTitle ? `, ${content.guestTitle}` : ""}
                </p>
              )}
              {content.date && <p className="mt-2 text-sm text-white/60">{content.date}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {alreadyDone && phase === "idle" && !replay && (
        <p className="absolute inset-x-0 bottom-6 text-center text-xs text-white/50">
          This website was inaugurated on {alreadyDone}.
        </p>
      )}
    </div>
  );
}
