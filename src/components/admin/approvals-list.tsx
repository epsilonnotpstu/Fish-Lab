"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock3, Loader2, Mail, Pencil, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { approveMember, rejectMember } from "@/actions/members";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type PendingApplication = {
  id: string;
  name: string;
  email: string;
  photo: string;
  status: "PENDING" | "REJECTED";
  appliedAt: string;
  reviewNote: string;
  group: string | null;
  supervisor: string | null;
  details: [string, string][];
};

export function ApprovalsList({ applications }: { applications: PendingApplication[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingApplication | null>(null);
  const [note, setNote] = useState("");
  const [, start] = useTransition();

  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusyId(id);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else toast.error(res.error);
      setBusyId(null);
    });
  };

  return (
    <>
      <div className="space-y-4">
        {applications.map((a) => (
          <article key={a.id} className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start gap-4">
              {a.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photo} alt="" className="size-14 rounded-2xl object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-accent font-bold text-white">
                  {initials(a.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{a.name}</h2>
                  {a.status === "PENDING" ? (
                    <Badge variant="secondary" className="gap-1"><Clock3 className="size-3" /> Pending</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><ShieldAlert className="size-3" /> Rejected</Badge>
                  )}
                  {a.group && <Badge variant="outline">{a.group}</Badge>}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Mail className="size-3.5" /> {a.email}
                  </a>
                  <span>Applied {formatDate(a.appliedAt, "MMM d, yyyy HH:mm")}</span>
                  {a.supervisor && <span>Supervisor: {a.supervisor}</span>}
                </p>
                {a.status === "REJECTED" && a.reviewNote && (
                  <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">Note: {a.reviewNote}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/admin/members/${a.id}`}><Pencil /> Open profile</Link>
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={busyId === a.id}
                  onClick={() => {
                    setNote(a.reviewNote);
                    setRejecting(a);
                  }}
                >
                  <X /> Reject
                </Button>
                <Button disabled={busyId === a.id} onClick={() => run(a.id, () => approveMember(a.id), `${a.name} approved`)}>
                  {busyId === a.id ? <Loader2 className="animate-spin" /> : <Check />} Approve
                </Button>
              </div>
            </div>

            <dl className={cn("mt-5 grid gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3")}>
              {a.details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                  <dd className="mt-0.5 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejecting?.name}?</DialogTitle>
            <DialogDescription>
              They receive an email with your note and can correct their details and ask for another review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Why is this request not approved? (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejecting) return;
                run(rejecting.id, () => rejectMember(rejecting.id, note), "Request rejected");
                setRejecting(null);
              }}
            >
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
