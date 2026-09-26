"use client";

import { useState } from "react";
import { Download, FileText, MoreVertical, Reply, Trash2 } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { ChatDto } from "@/lib/chat";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VoiceNote } from "./voice-note";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MessageBubble({
  message,
  mine,
  grouped,
  canDelete,
  onReply,
  onDelete,
}: {
  message: ChatDto;
  mine: boolean;
  grouped: boolean;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const author = message.author;

  if (message.deleted) {
    return (
      <div className={cn("flex px-1 py-0.5", mine ? "justify-end" : "justify-start")}>
        <p className="rounded-2xl bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground italic">This message was deleted</p>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-end gap-2 px-1 py-0.5", mine ? "flex-row-reverse" : "flex-row")}>
      {!mine &&
        (grouped ? (
          <span className="size-8 shrink-0" />
        ) : author?.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.photo} alt="" className="size-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-accent text-[10px] font-bold text-white">
            {initials(author?.name ?? "?")}
          </span>
        ))}

      <div
        className={cn(
          "relative max-w-[min(78%,34rem)] rounded-2xl px-3 py-2 text-sm shadow-sm",
          mine ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md bg-background",
          grouped && (mine ? "rounded-tr-md" : "rounded-tl-md"),
        )}
      >
        {!mine && !grouped && (
          <p className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand dark:text-brand-accent">
            {author?.name ?? "Unknown"}
            {author?.staff && (
              <span className="rounded bg-brand-accent/20 px-1.5 text-[9px] font-bold tracking-wide text-brand-accent uppercase">admin</span>
            )}
          </p>
        )}

        {message.replyTo && (
          <div className={cn("mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs", mine ? "border-white/50 bg-white/10" : "border-brand-accent bg-muted/70")}>
            <p className="font-semibold">{message.replyTo.author}</p>
            <p className={cn("truncate", mine ? "text-white/80" : "text-muted-foreground")}>{message.replyTo.preview}</p>
          </div>
        )}

        {message.kind === "IMAGE" && message.fileUrl && (
          <>
            <button type="button" onClick={() => setLightbox(true)} className="block overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.fileUrl}
                alt={message.fileName || "Photo"}
                className="max-h-80 w-full max-w-sm object-cover"
                loading="lazy"
              />
            </button>
            <Lightbox open={lightbox} close={() => setLightbox(false)} slides={[{ src: message.fileUrl }]} />
          </>
        )}

        {message.kind === "AUDIO" && message.fileUrl && (
          <VoiceNote src={message.fileUrl} durationSec={message.durationSec} mine={mine} />
        )}

        {message.kind === "FILE" && message.fileUrl && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2", mine ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/70")}
          >
            <FileText className="size-8 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{message.fileName || "File"}</span>
              <span className={cn("block text-xs", mine ? "text-white/70" : "text-muted-foreground")}>{fileSize(message.fileSize)}</span>
            </span>
            <Download className="ml-2 size-4 shrink-0 opacity-70" />
          </a>
        )}

        {message.body && <p className="mt-1 break-words whitespace-pre-wrap">{message.body}</p>}

        <p className={cn("mt-1 text-right text-[10px]", mine ? "text-white/60" : "text-muted-foreground")}>{time(message.createdAt)}</p>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "absolute top-1 opacity-0 transition group-hover:opacity-100 focus:opacity-100",
              mine ? "-left-7" : "-right-7",
            )}
            aria-label="Message actions"
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={mine ? "end" : "start"}>
            <DropdownMenuItem onSelect={onReply}><Reply /> Reply</DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 /> Delete</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
