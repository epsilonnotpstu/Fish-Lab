"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Mail, MailOpen, Reply, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMessage, setMessageRead } from "@/actions/messages";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "./confirm-dialog";

type Msg = { id: string; name: string; email: string; subject: string; type: string; message: string; read: boolean; createdAt: string };

export function MessagesInbox({ messages, initialId }: { messages: Msg[]; initialId?: string }) {
  const router = useRouter();
  const [list, setList] = useState(messages);
  const [prevMessages, setPrevMessages] = useState(messages);
  const [selected, setSelected] = useState<string | undefined>(initialId ?? messages[0]?.id);
  // Pick up fresh server data after router.refresh().
  if (messages !== prevMessages) {
    setPrevMessages(messages);
    setList(messages);
  }
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [confirm, setConfirm] = useState(false);
  const [, start] = useTransition();

  const shown = useMemo(
    () => list.filter((m) => (filter === "all" || !m.read) && `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q.toLowerCase())),
    [list, q, filter],
  );
  const current = list.find((m) => m.id === selected);

  const markRead = (id: string, read: boolean) => {
    setList((l) => l.map((m) => (m.id === id ? { ...m, read } : m)));
    start(async () => {
      const res = await setMessageRead(id, read);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  };

  const open = (id: string) => {
    setSelected(id);
    const m = list.find((x) => x.id === id);
    if (m && !m.read) markRead(id, true);
  };

  // A message opened from a link (?id=…) is marked read on the server once.
  useEffect(() => {
    const first = messages.find((m) => m.id === (initialId ?? messages[0]?.id));
    if (first && !first.read) {
      setMessageRead(first.id, true).then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!list.length) {
    return (
      <div className="flex flex-col items-center rounded-xl border bg-card py-20 text-center">
        <Inbox className="size-10 text-muted-foreground" />
        <p className="mt-4 font-medium">Your inbox is empty</p>
        <p className="text-sm text-muted-foreground">Messages from the contact form will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100vh-13rem)] lg:grid-cols-[380px_1fr]">
      <div className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="h-9 pl-9" />
          </div>
          <div className="flex gap-1">
            {(["all", "unread"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium capitalize", filter === f ? "bg-muted" : "text-muted-foreground")}>
                {f} {f === "unread" && `(${list.filter((m) => !m.read).length})`}
              </button>
            ))}
          </div>
        </div>
        <ul className="max-h-96 min-h-0 flex-1 overflow-y-auto lg:max-h-none">
          {shown.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => open(m.id)}
                className={cn("w-full border-b px-4 py-3 text-left transition hover:bg-muted/50", selected === m.id && "bg-accent/60")}
              >
                <div className="flex items-center gap-2">
                  {!m.read && <span className="size-2 shrink-0 rounded-full bg-brand-accent" />}
                  <span className={cn("truncate text-sm", m.read ? "font-medium" : "font-bold")}>{m.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(m.createdAt, "MMM d")}</span>
                </div>
                <p className="mt-0.5 truncate text-sm">{m.subject || "(no subject)"}</p>
                <p className="truncate text-xs text-muted-foreground">{m.message}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-h-0 overflow-y-auto">
        {current ? (
          <article className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold">{current.subject || "(no subject)"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{current.name}</span> &lt;{current.email}&gt; · {formatDate(current.createdAt, "MMM d, yyyy HH:mm")}
                </p>
                {current.type && <Badge variant="secondary" className="mt-2">{current.type}</Badge>}
              </div>
              <div className="flex gap-2">
                <Button asChild>
                  <a href={`mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject || "Your message"}`)}`}><Reply /> Reply</a>
                </Button>
                <Button variant="outline" size="icon" onClick={() => markRead(current.id, !current.read)} aria-label={current.read ? "Mark unread" : "Mark read"}>
                  {current.read ? <Mail /> : <MailOpen />}
                </Button>
                <Button variant="outline" size="icon" className="text-destructive" onClick={() => setConfirm(true)} aria-label="Delete"><Trash2 /></Button>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-muted/50 p-5 text-sm leading-relaxed whitespace-pre-wrap">{current.message}</div>
          </article>
        ) : (
          <div className="grid h-full place-items-center p-10 text-sm text-muted-foreground">Select a message</div>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this message?"
        destructive
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!current) return;
          const res = await deleteMessage(current.id);
          if (res.ok) {
            setList((l) => l.filter((m) => m.id !== current.id));
            setSelected(undefined);
            toast.success("Message deleted");
            router.refresh();
          } else toast.error(res.error);
          setConfirm(false);
        }}
      />
    </div>
  );
}
