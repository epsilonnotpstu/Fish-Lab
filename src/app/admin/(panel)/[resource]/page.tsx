import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { listRecords } from "@/lib/admin/resource-server";
import { pageParam, param } from "@/lib/params";
import { PageTitle } from "@/components/admin/page-title";
import { ResourceTable, type Row } from "@/components/admin/resource-table";
import { Pagination } from "@/components/site/pagination";
import { buildQuery } from "@/lib/params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }): Promise<Metadata> {
  return { title: getResource((await params).resource)?.label ?? "Admin" };
}

function cellValue(value: unknown, titleKey?: string): Row["cells"][string] {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return String(o[titleKey ?? "name"] ?? o.name ?? o.title ?? o.label ?? "");
  }
  if (typeof value === "boolean" || typeof value === "number") return value;
  return value == null ? "" : String(value);
}

export default async function ResourceList({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resource = getResource((await params).resource);
  if (!resource) notFound();
  await requireUser(resource.superAdminOnly ? "SUPER_ADMIN" : undefined);
  const sp = await searchParams;
  const q = param(sp, "q", 100);
  const page = pageParam(sp);
  const { rows, total, pageSize } = await listRecords(resource, { q, page });

  const relTitle = (col: string) => {
    const f = resource.fields.find((x) => x.name === col);
    return f?.relation ? getResource(f.relation)?.titleField : undefined;
  };
  const tableRows: Row[] = rows.map((r) => ({
    id: String(r.id),
    slug: typeof r.slug === "string" ? r.slug : undefined,
    cells: Object.fromEntries(resource.columns.map((c) => [c.name, cellValue(r[c.name], relTitle(c.name))])),
  }));
  const pages = resource.orderable ? 1 : Math.ceil(total / pageSize);

  return (
    <div>
      <PageTitle
        title={resource.label}
        description={resource.description}
        actions={
          <Button asChild size="lg">
            <Link href={`/admin/${resource.key}/new`}><Plus /> New {resource.singular.toLowerCase()}</Link>
          </Button>
        }
      />
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder={`Search ${resource.label.toLowerCase()}…`} className="h-9 pl-9" />
          </form>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "item" : "items"}
            {resource.orderable && !q && total > 1 && " · drag rows to reorder"}
          </p>
        </div>
        <ResourceTable
          resource={{
            key: resource.key,
            singular: resource.singular,
            columns: resource.columns,
            orderable: Boolean(resource.orderable) && !q,
            publicPath: resource.publicPath,
            toggles: resource.fields.filter((f) => f.type === "boolean").map((f) => f.name),
          }}
          rows={tableRows}
        />
      </div>
      <Pagination page={page} pages={pages} hrefFor={(p) => buildQuery(`/admin/${resource.key}`, { q, page: p })} />
    </div>
  );
}
