"use client";

// Field renderer shared by the admin panel, the member portal and the public
// sign-up wizard, so every form validates and looks the same.

import { useState } from "react";
import type { Field } from "@/lib/admin/resources";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageField } from "@/components/admin/fields/image-field";
import { RichTextEditor } from "@/components/admin/fields/rich-text-editor";
import { GalleryField, RelationsField, RepeaterField, TagsField } from "@/components/admin/fields/collection-fields";

export type Values = Record<string, unknown>;
export type Options = Record<string, { value: string; label: string }[]>;

export const SIDEBAR_SECTION = "Publishing";
const NONE = "__none__";

export function FieldInput({
  field,
  value,
  set,
  options,
  values,
  slugTouched,
  onSlugTouched,
}: {
  field: Field;
  value: unknown;
  set: (v: unknown) => void;
  options: Options;
  values: Values;
  slugTouched: boolean;
  onSlugTouched: () => void;
}) {
  const id = `f-${field.name}`;
  switch (field.type) {
    case "textarea":
      return <Textarea id={id} rows={4} value={String(value ?? "")} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
    case "richtext":
      return <RichTextEditor value={String(value ?? "")} onChange={set} />;
    case "slug":
      return (
        <div className="flex items-center rounded-lg border bg-muted/40 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <span className="pl-3 text-sm text-muted-foreground">/</span>
          <input
            id={id}
            value={String(value ?? "")}
            onChange={(e) => {
              onSlugTouched();
              set(slugify(e.target.value));
            }}
            className="h-8 flex-1 bg-transparent px-1 text-sm outline-none"
            placeholder={field.from ? `auto from ${field.from}` : ""}
          />
          {field.from && slugTouched && (
            <button type="button" className="px-3 text-xs text-muted-foreground hover:text-foreground" onClick={() => set(slugify(String(values[field.from!] ?? "")))}>
              Regenerate
            </button>
          )}
        </div>
      );
    case "number":
      return <Input id={id} type="number" inputMode="numeric" value={String(value ?? "")} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />;
    case "email":
      return <Input id={id} type="email" value={String(value ?? "")} onChange={(e) => set(e.target.value)} placeholder={field.placeholder ?? "name@example.com"} />;
    case "url":
      return <Input id={id} value={String(value ?? "")} onChange={(e) => set(e.target.value)} placeholder={field.placeholder ?? "https://…"} />;
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={String(value || "#000000")} onChange={(e) => set(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1" aria-label={field.label} />
          <Input id={id} value={String(value ?? "")} onChange={(e) => set(e.target.value)} className="font-mono uppercase" maxLength={7} />
        </div>
      );
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <Switch id={id} checked={Boolean(value)} onCheckedChange={(c) => set(c)} />
          <Label htmlFor={id} className="cursor-pointer text-sm font-normal text-muted-foreground">{value ? "Yes" : "No"}</Label>
        </div>
      );
    case "date":
      return <Input id={id} type="date" value={String(value ?? "")} onChange={(e) => set(e.target.value)} />;
    case "datetime":
      return <Input id={id} type="datetime-local" value={String(value ?? "")} onChange={(e) => set(e.target.value)} />;
    case "select":
      return (
        <Select value={String(value || "")} onValueChange={set}>
          <SelectTrigger id={id} className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "relation":
      return (
        <Select value={String(value || NONE)} onValueChange={(v) => set(v === NONE ? "" : v)}>
          <SelectTrigger id={id} className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {(options[field.name] ?? []).filter((o) => o.value !== values.__id).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "relations":
      return <RelationsField options={options[field.name] ?? []} value={(value as string[]) ?? []} onChange={set} />;
    case "image":
      return <ImageField value={String(value ?? "")} onChange={set} />;
    case "file":
      return <ImageField kind="file" value={String(value ?? "")} onChange={set} />;
    case "gallery":
      return <GalleryField value={(value as string[]) ?? []} onChange={set} />;
    case "tags":
      return <TagsField value={(value as string[]) ?? []} onChange={set} placeholder={field.placeholder} />;
    case "repeater":
      return <RepeaterField subfields={field.subfields ?? []} value={(value as Record<string, string>[]) ?? []} onChange={set} />;
    default:
      return <Input id={id} value={String(value ?? "")} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} maxLength={field.max ?? 500} />;
  }
}

export function FieldRow(props: Parameters<typeof FieldInput>[0] & { error?: string }) {
  const { field, error } = props;
  return (
    <div className={cn("space-y-2", !field.half && "sm:col-span-2")} data-field={field.name}>
      <Label htmlFor={`f-${field.name}`} className="text-sm font-medium">
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <FieldInput {...props} />
      {field.help && !error && <p className="text-xs text-muted-foreground">{field.help}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function groupBySection(fields: Field[], fallback: string) {
  const map = new Map<string, Field[]>();
  for (const f of fields) {
    const key = f.section ?? fallback;
    map.set(key, [...(map.get(key) ?? []), f]);
  }
  return [...map.entries()];
}


/** Simple helper for forms that just need a grid of fields. */
export function FieldsGrid({
  fields,
  values,
  errors = {},
  options = {},
  onChange,
  className,
}: {
  fields: Field[];
  values: Values;
  errors?: Record<string, string>;
  options?: Options;
  onChange: (name: string, value: unknown) => void;
  className?: string;
}) {
  const [slugTouched, setSlugTouched] = useState(true);
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
      {fields
        .filter((f) => !f.showIf || f.showIf.values.includes(String(values[f.showIf.field] ?? "")))
        .map((f) => (
          <FieldRow
            key={f.name}
            field={f}
            value={values[f.name]}
            set={(v) => onChange(f.name, v)}
            options={options}
            values={values}
            slugTouched={slugTouched}
            onSlugTouched={() => setSlugTouched(true)}
            error={errors[f.name]}
          />
        ))}
    </div>
  );
}
