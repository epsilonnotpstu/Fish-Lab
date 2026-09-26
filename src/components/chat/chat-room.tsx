"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, Loader2, Mic, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { deleteMessage, markChatSeen, sendMessage } from "@/actions/chat";
import type { ChatDto } from "@/lib/chat";
import { uploadFileDetailed } from "@/components/admin/fields/upload";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export function ChatRoom({
  initialMessages,
  me,
  staff,
  title,
  className,
}: {
  initialMessages: ChatDto[];
  me: string;
  staff: boolean;
  title: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatDto[]>(initialMessages);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatDto | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= 40);
  const [atBottom, setAtBottom] = useState(true);
  const [, startSend] = useTransition();

  const atBottomRef = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const merge = useCallback((incoming: ChatDto[]) => {
    if (!incoming.length) return;
    setMessages((current) => {
      const byId = new Map(current.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  // Live updates over SSE; EventSource reconnects by itself.
  useEffect(() => {
    const last = messages[messages.length - 1]?.createdAt ?? new Date().toISOString();
    const source = new EventSource(`/api/chat/stream?since=${encodeURIComponent(last)}`);
    source.addEventListener("messages", (e) => {
      const incoming = JSON.parse((e as MessageEvent).data) as ChatDto[];
      merge(incoming);
      const mine = incoming.some((m) => m.author?.id === me);
      if (mine || atBottomRef.current) requestAnimationFrame(() => scrollToBottom(true));
    });
    source.addEventListener("updated", (e) => merge(JSON.parse((e as MessageEvent).data) as ChatDto[]));
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merge, me, scrollToBottom]);

  useEffect(() => {
    markChatSeen();
  }, [messages.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (el.scrollTop < 80 && hasOlder && !loadingOlder) void loadOlder();
  };

  const loadOlder = async () => {
    const el = listRef.current;
    const oldest = messages[0]?.id;
    if (!oldest || !el) return;
    setLoadingOlder(true);
    const before = el.scrollHeight;
    try {
      const res = await fetch(`/api/chat/messages?before=${oldest}`);
      const data = (await res.json()) as { messages: ChatDto[] };
      if (!data.messages?.length) setHasOlder(false);
      else {
        merge(data.messages);
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - before + el.scrollTop;
        });
        if (data.messages.length < 40) setHasOlder(false);
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  const post = (payload: Parameters<typeof sendMessage>[0]) =>
    startSend(async () => {
      const res = await sendMessage(payload);
      if (res.ok && res.message) {
        merge([res.message]);
        setReplyTo(null);
        requestAnimationFrame(() => scrollToBottom(true));
      } else toast.error(res.error ?? "Could not send");
    });

  const submitText = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    post({ kind: "TEXT", body, replyToId: replyTo?.id ?? null });
  };

  const sendFile = async (file: File) => {
    setUploading(file.name);
    try {
      const uploaded = await uploadFileDetailed(file, "chat");
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      post({
        kind: isImage ? "IMAGE" : isAudio ? "AUDIO" : "FILE",
        body: "",
        fileUrl: uploaded.url,
        fileName: file.name,
        fileSize: uploaded.bytes,
        mimeType: file.type,
        durationSec: uploaded.duration,
        width: uploaded.width,
        height: uploaded.height,
        replyToId: replyTo?.id ?? null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size > 1000) {
          const ext = (mr.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
          await sendFile(new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type }));
        }
      };
      mr.start();
      recorder.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone permission is needed for voice messages.");
    }
  };

  const stopRecording = (send: boolean) => {
    if (recordTimer.current) clearInterval(recordTimer.current);
    const mr = recorder.current;
    if (!mr) return;
    if (!send) mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop());
    mr.stop();
    recorder.current = null;
    setRecording(false);
  };

  const remove = async (id: string) => {
    const res = await deleteMessage(id);
    if (res.ok) setMessages((m) => m.map((x) => (x.id === id ? { ...x, deleted: true, body: "", fileUrl: "" } : x)));
    else toast.error(res.error ?? "Could not delete");
  };

  const rows = messages.map((m, i) => {
    const day = dayLabel(m.createdAt);
    const previous = messages[i - 1];
    const showDay = !previous || dayLabel(previous.createdAt) !== day;
    return {
      message: m,
      day,
      showDay,
      grouped: !showDay && previous?.author?.id === m.author?.id,
    };
  });

  return (
    <div className={cn("relative flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col overflow-hidden rounded-3xl border bg-card shadow-sm", className)}>
      <header className="flex items-center gap-3 border-b px-5 py-3">
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-accent text-sm font-bold text-white">
          LAB
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">Everyone in the lab · members and admins</p>
        </div>
      </header>

      <div ref={listRef} onScroll={onScroll} className="relative flex-1 space-y-1 overflow-y-auto bg-surface/60 px-3 py-4 sm:px-5">
        {loadingOlder && (
          <p className="flex justify-center py-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" /></p>
        )}
        {messages.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">No messages yet — say hello to the lab.</p>
        )}
        {rows.map(({ message: m, day, showDay, grouped }) => (
          <div key={m.id}>
            {showDay && (
              <p className="my-4 text-center">
                <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">{day}</span>
              </p>
            )}
            <MessageBubble
              message={m}
              mine={m.author?.id === me}
              grouped={grouped}
              canDelete={m.author?.id === me || staff}
              onReply={() => setReplyTo(m)}
              onDelete={() => remove(m.id)}
            />
          </div>
        ))}
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute right-8 bottom-28 grid size-10 place-items-center rounded-full border bg-background shadow-lg"
          aria-label="Jump to latest"
        >
          <ArrowDown className="size-4" />
        </button>
      )}

      <footer className="border-t bg-background/80 p-3 sm:p-4">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-brand-accent bg-muted/60 px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand dark:text-brand-accent">{replyTo.author?.name ?? "Someone"}</p>
              <p className="truncate text-muted-foreground">{replyTo.body || replyTo.fileName || "Attachment"}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="size-4" /></button>
          </div>
        )}
        {uploading && (
          <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Uploading {uploading}…
          </p>
        )}

        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
            <span className="size-3 animate-pulse rounded-full bg-destructive" />
            <span className="font-mono text-sm">
              {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:{String(recordSeconds % 60).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted-foreground">Recording voice message…</span>
            <button type="button" onClick={() => stopRecording(false)} className="ml-auto rounded-full px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="button" onClick={() => stopRecording(true)} className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Send voice message">
              <Send className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Attach a file">
              <Paperclip className="size-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void sendFile(f);
              }}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitText();
                }
              }}
              rows={1}
              placeholder="Write a message…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15"
            />
            {text.trim() ? (
              <button type="button" onClick={submitText} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90" aria-label="Send">
                <Send className="size-5" />
              </button>
            ) : (
              <button type="button" onClick={startRecording} className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90")} aria-label="Record a voice message">
                <Mic className="size-5" />
              </button>
            )}
          </div>
        )}
        <p className="mt-2 text-center text-[11px] text-muted-foreground sm:text-left">
          Enter sends · Shift+Enter for a new line
        </p>
      </footer>
    </div>
  );
}
