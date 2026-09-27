"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, PartyPopper, PlayCircle, RotateCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { regenerateCeremonyKey, resetInauguration, setCeremonyMode } from "@/actions/inauguration";
import type { CeremonyContent } from "@/lib/inauguration";
import { CeremonyScreen } from "@/components/site/ceremony/ceremony-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "./confirm-dialog";

export function InaugurationPanel({
  superAdmin,
  enabled,
  inauguratedAt,
  ceremonyLink,
  content,
}: {
  superAdmin: boolean;
  enabled: boolean;
  inauguratedAt: string | null;
  ceremonyLink: string;
  content: CeremonyContent;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [link, setLink] = useState(ceremonyLink);
  const [copied, setCopied] = useState(false);
  const [rehearsing, setRehearsing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else toast.error(res.error ?? "Something went wrong");
    });

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Ceremony link copied");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PartyPopper className="size-4" /> Ceremony status</CardTitle>
          <CardDescription>
            {inauguratedAt
              ? `The website was inaugurated on ${inauguratedAt}.`
              : enabled
                ? "Ceremony mode is on: visitors see the waiting screen until the chief guest launches the website."
                : "Ceremony mode is off and the website is open to everyone."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <span>
              <span className="block font-medium">Ceremony mode</span>
              <span className="block text-sm text-muted-foreground">
                Show the inauguration screen instead of the public website.
              </span>
            </span>
            <Switch
              checked={enabled}
              disabled={busy}
              onCheckedChange={(v) => run(() => setCeremonyMode(v), v ? "Ceremony mode is on" : "Ceremony mode is off")}
            />
          </label>

          {inauguratedAt && (
            <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Inaugurated by {content.guestName || "the chief guest"}
              {content.guestTitle ? `, ${content.guestTitle}` : ""} — {inauguratedAt}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="size-4" /> The chief guest&apos;s link</CardTitle>
          <CardDescription>
            Open this link on the device the chief guest will use. Only this link (or a signed-in administrator) can press
            the button, so nobody can launch the website early.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{link || "Turn ceremony mode on to create the link"}</code>
            <Button variant="outline" onClick={copy} disabled={!link}>
              {copied ? <Check /> : <Copy />} Copy
            </Button>
          </div>
          {superAdmin && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await regenerateCeremonyKey();
                  if (res.ok && res.key) {
                    setLink(`${window.location.origin}/?key=${res.key}`);
                    toast.success("New link created — the old one no longer works");
                  } else toast.error(res.error ?? "Could not create a new link");
                })
              }
            >
              <RotateCcw /> Create a new link
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="size-4" /> Rehearse and edit</CardTitle>
          <CardDescription>Practise the animation without recording anything, or change the ceremony wording.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setRehearsing(true)}><PlayCircle /> Rehearse the animation</Button>
          <Button variant="outline" asChild>
            <Link href="/admin/settings">Edit ceremony text</Link>
          </Button>
          {superAdmin && inauguratedAt && (
            <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => setConfirmReset(true)}>
              {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reset (mark as not inaugurated)
            </Button>
          )}
        </CardContent>
      </Card>

      {rehearsing && (
        <div className="fixed inset-0 z-[100]">
          <CeremonyScreen content={content} armed ceremonyKey="" replay />
          <button
            type="button"
            onClick={() => setRehearsing(false)}
            className="absolute top-5 right-5 z-[101] rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white backdrop-blur"
          >
            Close rehearsal
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the inauguration?"
        description="The recorded date is cleared and, with ceremony mode on, visitors see the waiting screen again."
        confirmLabel="Reset"
        destructive
        onConfirm={async () => {
          const res = await resetInauguration();
          if (res.ok) {
            toast.success("Ceremony reset");
            router.refresh();
          } else toast.error(res.error);
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
