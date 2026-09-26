"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Field } from "@/lib/admin/resources";
import type { ActionResult } from "@/actions/resources";
import { deleteResource, saveResource, saveSettings } from "@/actions/resources";
import { updateOwnProfile } from "@/actions/member-auth";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageField } from "./fields/image-field";
import { RichTextEditor } from "./fields/rich-text-editor";
import { GalleryField, RelationsField, RepeaterField, TagsField } from "./fields/collection-fields";
import { ConfirmDialog } from "./confirm-dialog";

type Values = Record<string, unknown>;
type Options = Record<string, { value: string; label: string }[]>;

const SIDEBAR_SECTION = "Publishing";
const NONE = "__none__";

function FieldInput({
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

function FieldRow(props: Parameters<typeof FieldInput>[0] & { error?: string }) {
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

function groupBySection(fields: Field[], fallback: string) {
  const map = new Map<string, Field[]>();
  for (const f of fields) {
    const key = f.section ?? fallback;
    map.set(key, [...(map.get(key) ?? []), f]);
  }
  return [...map.entries()];
}

export function ResourceForm({
  mode,
  resourceKey,
  singular,
  label,
  recordId,
  fields,
  initial,
  options,
  publicUrl,
}: {
  mode: "resource" | "settings" | "profile";
  resourceKey: string;
  singular: string;
  label: string;
  recordId: string | null;
  fields: Field[];
  initial: Values;
  options: Options;
  publicUrl?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(recordId));

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setField = (name: string, v: unknown) => {
    setDirty(true);
    setErrors((e) => {
      if (!(name in e)) return e;
      const rest = { ...e };
      delete rest[name];
      return rest;
    });
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      // Keep the slug in sync with its source until the user edits it.
      const slugField = fields.find((f) => f.type === "slug" && f.from === name);
      if (slugField && !slugTouched) next[slugField.name] = slugify(String(v ?? ""));
      return next;
    });
  };

  const visible = (f: Field) => !f.showIf || f.showIf.values.includes(String(values[f.showIf.field] ?? ""));
  const visibleFields = useMemo(() => fields.filter(visible), [fields, values]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () =>
    startSave(async () => {
      const payload = Object.fromEntries(visibleFields.map((f) => [f.name, values[f.name]]));
      const res: ActionResult =
        mode === "settings"
          ? await saveSettings(payload)
          : mode === "profile"
            ? await updateOwnProfile(payload)
            : await saveResource(resourceKey, recordId, payload);
      if (res.ok) {
        setDirty(false);
        setErrors({});
        toast.success(mode === "resource" ? `${singular} saved` : "Saved");
        if (mode === "resource" && !recordId && res.id) router.replace(`/admin/${resourceKey}/${res.id}`);
        else router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error ?? "Could not save");
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

  const rowProps = (f: Field) => ({
    field: f,
    value: values[f.name],
    set: (v: unknown) => setField(f.name, v),
    options,
    values: { ...values, __id: recordId },
    slugTouched,
    onSlugTouched: () => setSlugTouched(true),
    error: errors[f.name],
  });

  const saveButton = (
    <Button type="submit" size="lg" disabled={saving} className="min-w-28">
      {saving ? <Loader2 className="animate-spin" /> : <Save />}
      {saving ? "Saving…" : "Save"}
    </Button>
  );

  const header = (
    <div className="sticky top-16 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b bg-muted/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {mode === "resource" && (
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link href={`/admin/${resourceKey}`} aria-label="Back"><ArrowLeft /></Link>
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <h1 className="truncate text-lg font-bold">
          {mode === "settings" ? "Site settings" : recordId ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
        </h1>
      </div>
      {dirty && <span className="hidden text-xs text-amber-600 sm:inline dark:text-amber-400">Unsaved changes</span>}
      {publicUrl && (
        <Button type="button" variant="outline" asChild>
          <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink /> View</a>
        </Button>
      )}
      {saveButton}
    </div>
  );

  if (mode === "profile") {
    return (
      <form onSubmit={(e) => (e.preventDefault(), submit())} className="space-y-6">
        <Card>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {visibleFields.map((f) => <FieldRow key={f.name} {...rowProps(f)} />)}
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
          {publicUrl && (
            <Button type="button" variant="outline" size="lg" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink /> View public profile</a>
            </Button>
          )}
          {saveButton}
        </div>
      </form>
    );
  }

  if (mode === "settings") {
    const sections = groupBySection(visibleFields, "General");
    return (
      <form onSubmit={(e) => (e.preventDefault(), submit())}>
        {header}
        <Tabs defaultValue={sections[0]?.[0]} className="gap-6">
          <TabsList className="h-auto flex-wrap justify-start">
            {sections.map(([name, fs]) => (
              <TabsTrigger key={name} value={name} className="relative">
                {name}
                {fs.some((f) => errors[f.name]) && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-destructive" />}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map(([name, fs]) => (
            <TabsContent key={name} value={name} forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  {fs.map((f) => <FieldRow key={f.name} {...rowProps(f)} />)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </form>
    );
  }

  const main = visibleFields.filter((f) => f.section !== SIDEBAR_SECTION);
  const side = visibleFields.filter((f) => f.section === SIDEBAR_SECTION);
  const sections = groupBySection(main, "Details");

  return (
    <form onSubmit={(e) => (e.preventDefault(), submit())}>
      {header}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {sections.map(([name, fs]) => (
            <Card key={name}>
              {sections.length > 1 && (
                <CardHeader><CardTitle>{name}</CardTitle></CardHeader>
              )}
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {fs.map((f) => <FieldRow key={f.name} {...rowProps(f)} />)}
              </CardContent>
            </Card>
          ))}
        </div>
        <aside className="space-y-6">
          <Card className="xl:sticky xl:top-36">
            <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {side.map((f) => <FieldRow key={f.name} {...rowProps(f)} field={{ ...f, half: false }} />)}
              <div className="flex flex-col gap-2 border-t pt-4">
                {saveButton}
                {recordId && (
                  <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 /> Delete {singular.toLowerCase()}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete this ${singular.toLowerCase()}?`}
        description="This permanently removes it from the website. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!recordId) return;
          const res = await deleteResource(resourceKey, recordId);
          if (res.ok) {
            setDirty(false);
            toast.success("Deleted");
            router.replace(`/admin/${resourceKey}`);
          } else toast.error(res.error);
          setConfirmDelete(false);
        }}
      />
    </form>
  );
}
