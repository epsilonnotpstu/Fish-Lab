"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock3, LoaderCircle, LogOut, MapPin, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { checkIn, checkOut } from "@/actions/attendance";
import { cn } from "@/lib/utils";

export type TodayState = {
  checkedInAt: string | null;
  checkedOutAt: string | null;
  distance: number | null;
  withinFence: boolean;
};

function useLocation() {
  return () =>
    new Promise<{ lat: number | null; lng: number | null; accuracy: number | null; denied: boolean }>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ lat: null, lng: null, accuracy: null, denied: true });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            denied: false,
          }),
        () => resolve({ lat: null, lng: null, accuracy: null, denied: true }),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
      );
    });
}

export function AttendancePanel({ today, radius }: { today: TodayState; radius: number }) {
  const router = useRouter();
  const getLocation = useLocation();
  const [busy, start] = useTransition();
  const [locating, setLocating] = useState(false);

  const act = (kind: "in" | "out") =>
    start(async () => {
      setLocating(true);
      const pos = await getLocation();
      setLocating(false);
      const payload = { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, source: "WEB" as const };
      const res = kind === "in" ? await checkIn(payload) : await checkOut(payload);
      if (res.ok) {
        toast.success(kind === "in" ? "Attendance recorded" : "Checked out");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not record attendance");
      }
    });

  const state = today.checkedOutAt ? "done" : today.checkedInAt ? "in" : "out";
  const working = busy || locating;

  return (
    <div className="rounded-3xl border bg-card p-6 text-center sm:p-10">
      <p className="text-sm font-medium text-muted-foreground">
        {state === "out" && "You have not marked attendance today"}
        {state === "in" && `In the lab since ${today.checkedInAt}`}
        {state === "done" && `Present today · ${today.checkedInAt} – ${today.checkedOutAt}`}
      </p>

      {state !== "done" && (
        <button
          type="button"
          onClick={() => act(state === "out" ? "in" : "out")}
          disabled={working}
          className={cn(
            "mx-auto mt-6 flex size-44 flex-col items-center justify-center gap-2 rounded-full text-lg font-bold shadow-xl transition active:scale-95 disabled:opacity-70 sm:size-52",
            state === "out"
              ? "bg-brand text-brand-fg shadow-brand/30 hover:brightness-110"
              : "bg-brand-accent text-accent-fg shadow-brand-accent/30 hover:brightness-110",
          )}
        >
          {working ? (
            <>
              <LoaderCircle className="size-10 animate-spin" />
              <span className="text-sm font-medium">{locating ? "Finding you…" : "Saving…"}</span>
            </>
          ) : state === "out" ? (
            <>
              <CalendarCheck className="size-10" />
              Present
            </>
          ) : (
            <>
              <LogOut className="size-10" />
              Check out
            </>
          )}
        </button>
      )}

      {state === "done" && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CalendarCheck className="size-5" /> Attendance complete for today
        </p>
      )}

      <div className="mt-8 space-y-2 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" /> Your location is checked against the lab (within {radius} m) and stored with the record.
        </p>
        {today.checkedInAt && today.distance != null && (
          <p className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" /> Checked in about {today.distance} m from the lab point.
          </p>
        )}
        {today.checkedInAt && !today.withinFence && (
          <p className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <TriangleAlert className="size-3.5" /> This record was made outside the usual lab area.
          </p>
        )}
      </div>
    </div>
  );
}
