"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, Link2, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFile, type UploadKind } from "./upload";

export function ImageField({
  value,
  onChange,
  kind = "image",
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  kind?: UploadKind;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handle = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file, kind));
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setShowUrl(true);
    } finally {
      setBusy(false);
    }
  };

  const accept = kind === "image" ? "image/*" : ".pdf,image/*";

  return (
    <div className="space-y-2">
      {value ? (
        <div className={cn("group relative overflow-hidden rounded-xl border bg-muted/40", compact ? "h-24" : "h-44")}>
          {kind === "image" || /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(value) || value.includes("images.unsplash.com") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-contain" />
          ) : (
            <a href={value} target="_blank" rel="noreferrer" className="flex size-full items-center justify-center gap-2 text-sm font-medium">
              <FileText className="size-5" /> View file
            </a>
          )}
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <Button type="button" size="icon-sm" variant="secondary" onClick={() => inputRef.current?.click()} aria-label="Replace">
              <UploadCloud />
            </Button>
            <Button type="button" size="icon-sm" variant="destructive" onClick={() => onChange("")} aria-label="Remove" className="bg-background">
              <Trash2 />
            </Button>
          </div>
          {busy && <div className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="size-6 animate-spin" /></div>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handle(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted-foreground transition hover:border-brand-accent hover:bg-accent/40",
            compact ? "h-24" : "h-36",
            drag && "border-brand-accent bg-accent/50",
          )}
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          <span>{busy ? "Uploading…" : <>Drop {kind === "image" ? "an image" : "a file"} or <span className="font-medium text-foreground">browse</span></>}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handle(e.target.files?.[0] ?? undefined)} />
      {showUrl || value ? (
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className="h-8 pl-8 text-xs" />
        </div>
      ) : (
        <button type="button" onClick={() => setShowUrl(true)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
          or paste a URL
        </button>
      )}
    </div>
  );
}
