"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, ImageOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteResource, reorderResource, toggleField } from "@/actions/resources";
import type { ListColumn } from "@/lib/admin/resources";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "./confirm-dialog";

export type Row = { id: string; slug?: string; cells: Record<string, string | number | boolean> };

type TableResource = {
  key: string;
  singular: string;
  columns: ListColumn[];
  orderable: boolean;
  publicPath?: string;
  toggles: string[];
};

function Cell({ col, value, row, resource }: { col: ListColumn; value: Row["cells"][string]; row: Row; resource: TableResource }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  switch (col.type) {
    case "image":
      return value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(value)} alt="" className="size-11 rounded-lg object-cover" loading="lazy" />
      ) : (
        <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground"><ImageOff className="size-4" /></span>
      );
    case "boolean":
      if (resource.toggles.includes(col.name)) {
        return (
          <Switch
            checked={Boolean(value)}
            disabled={pending}
            onCheckedChange={() =>
              start(async () => {
                const res = await toggleField(resource.key, row.id, col.name);
                if (!res.ok) toast.error(res.error);
                router.refresh();
              })
            }
            aria-label={col.label}
          />
        );
      }
      return value ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>;
    case "date":
      return <span className="whitespace-nowrap text-muted-foreground">{formatDate(String(value))}</span>;
    case "badge":
      return value ? <Badge variant="secondary">{String(value)}</Badge> : null;
    case "relation":
      return <span className="text-muted-foreground">{String(value || "—")}</span>;
    default:
      return <span className={col.name === resource.columns.find((c) => !c.type)?.name ? "font-medium" : "text-muted-foreground"}>{String(value ?? "")}</span>;
  }
}

function RowView({ row, resource, onDelete }: { row: Row; resource: TableResource; onDelete: (row: Row) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !resource.orderable });
  const titleCol = resource.columns.find((c) => !c.type || c.type === "text");
  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("border-b bg-card transition-colors last:border-0 hover:bg-muted/40", isDragging && "relative z-10 shadow-lg")}
    >
      {resource.orderable && (
        <td className="w-10 pl-3">
          <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing" aria-label="Drag to reorder">
            <GripVertical className="size-4" />
          </button>
        </td>
      )}
      {resource.columns.map((col) => (
        <td key={col.name} className={cn("px-4 py-3 text-sm", col.type === "image" && "w-16 pr-0")}>
          {col.name === titleCol?.name ? (
            <Link href={`/admin/${resource.key}/${row.id}`} className="font-medium hover:text-brand hover:underline dark:hover:text-brand-accent">
              {String(row.cells[col.name] || "(untitled)")}
            </Link>
          ) : (
            <Cell col={col} value={row.cells[col.name]} row={row} resource={resource} />
          )}
        </td>
      ))}
      <td className="w-12 pr-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/admin/${resource.key}/${row.id}`}><Pencil /> Edit</Link></DropdownMenuItem>
            {resource.publicPath && row.slug && (
              <DropdownMenuItem asChild>
                <a href={resource.publicPath.replace(":slug", row.slug)} target="_blank" rel="noreferrer"><ExternalLink /> View on site</a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row)}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export function ResourceTable({ resource, rows: initial }: { resource: TableResource; rows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [, start] = useTransition();
  // Pick up fresh server data after router.refresh().
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rows.findIndex((r) => r.id === e.active.id);
    const to = rows.findIndex((r) => r.id === e.over!.id);
    const next = arrayMove(rows, from, to);
    setRows(next);
    start(async () => {
      const res = await reorderResource(resource.key, next.map((r) => r.id));
      if (res.ok) toast.success("Order saved");
      else {
        toast.error(res.error);
        setRows(initial);
      }
    });
  };

  if (!rows.length) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-medium">Nothing here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Create your first {resource.singular.toLowerCase()} to get started.</p>
        <Button asChild className="mt-5"><Link href={`/admin/${resource.key}/new`}>New {resource.singular.toLowerCase()}</Link></Button>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {resource.orderable && <th className="w-10" />}
                {resource.columns.map((c) => <th key={c.name} className="px-4 py-2.5 font-medium">{c.label}</th>)}
                <th className="w-12" />
              </tr>
            </thead>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {rows.map((row) => <RowView key={row.id} row={row} resource={resource} onDelete={setToDelete} />)}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete this ${resource.singular.toLowerCase()}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          const res = await deleteResource(resource.key, toDelete.id);
          if (res.ok) {
            toast.success("Deleted");
            setRows((r) => r.filter((x) => x.id !== toDelete.id));
            router.refresh();
          } else toast.error(res.error);
          setToDelete(null);
        }}
      />
    </>
  );
}
