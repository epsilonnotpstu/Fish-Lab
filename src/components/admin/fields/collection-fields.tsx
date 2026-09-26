"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Search, Trash2, X } from "lucide-react";
import type { SubField } from "@/lib/admin/resources";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageField } from "./image-field";

type RowValue = Record<string, string>;

function move<T>(arr: T[], from: number, to: number) {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function RepeaterField({ subfields, value, onChange }: { subfields: SubField[]; value: RowValue[]; onChange: (v: RowValue[]) => void }) {
  const empty = () => Object.fromEntries(subfields.map((s) => [s.name, ""]));
  const hasImage = subfields.some((s) => s.type === "image");
  return (
    <div className="space-y-3">
      {value.map((row, i) => (
        <div key={i} className="relative rounded-xl border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-xs" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} aria-label="Move up"><ArrowUp /></Button>
              <Button type="button" variant="ghost" size="icon-xs" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} aria-label="Move down"><ArrowDown /></Button>
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove" className="text-destructive"><Trash2 /></Button>
            </div>
          </div>
          <div className={cn("grid gap-3", hasImage ? "sm:grid-cols-[200px_1fr]" : "sm:grid-cols-2")}>
            {subfields.filter((s) => s.type === "image").map((s) => (
              <div key={s.name} className="space-y-1.5">
                <Label className="text-xs">{s.label}</Label>
                <ImageField compact value={row[s.name] ?? ""} onChange={(v) => onChange(value.map((r, j) => (j === i ? { ...r, [s.name]: v } : r)))} />
              </div>
            ))}
            <div className={cn("grid gap-3", !hasImage && "contents", hasImage && "content-start")}>
              {subfields.filter((s) => s.type !== "image").map((s) => (
                <div key={s.name} className={cn("space-y-1.5", s.type === "textarea" && "sm:col-span-2")}>
                  <Label className="text-xs">{s.label}</Label>
                  {s.type === "textarea" ? (
                    <Textarea rows={3} value={row[s.name] ?? ""} placeholder={s.placeholder} onChange={(e) => onChange(value.map((r, j) => (j === i ? { ...r, [s.name]: e.target.value } : r)))} />
                  ) : (
                    <Input value={row[s.name] ?? ""} placeholder={s.placeholder ?? (s.type === "url" ? "https://…" : undefined)} onChange={(e) => onChange(value.map((r, j) => (j === i ? { ...r, [s.name]: e.target.value } : r)))} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...value, empty()])}>
        <Plus /> Add item
      </Button>
    </div>
  );
}

export function TagsField({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t, i) => (
          <span key={t + i} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            {t}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${t}`} className="opacity-60 hover:opacity-100"><X className="size-3" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={placeholder ?? "Type and press Enter"}
          className="min-w-[160px] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

export function GalleryField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((url, i) => (
            <div key={url + i} className="group relative aspect-square overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <div className="absolute inset-x-1 top-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                <Button type="button" size="icon-xs" variant="secondary" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} aria-label="Move left"><ArrowUp className="-rotate-90" /></Button>
                <Button type="button" size="icon-xs" variant="secondary" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ImageField compact value="" onChange={(url) => url && onChange([...value, url])} />
    </div>
  );
}

export function RelationsField({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      {options.length > 8 && (
        <div className="relative border-b">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="h-9 w-full bg-transparent pr-3 pl-8 text-sm outline-none" />
        </div>
      )}
      <ul className="max-h-60 overflow-y-auto p-1">
        {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No options</li>}
        {filtered.map((o) => {
          const on = value.includes(o.value);
          return (
            <li key={o.value}>
              <button type="button" onClick={() => toggle(o.value)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-muted", on && "font-medium")}>
                <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>
                  {on && <Check className="size-3" />}
                </span>
                {o.label}
              </button>
            </li>
          );
        })}
      </ul>
      {value.length > 0 && <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">{value.length} selected</p>}
    </div>
  );
}
