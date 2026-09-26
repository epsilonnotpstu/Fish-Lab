import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { getRecord, relationOptions, toFormValues } from "@/lib/admin/resource-server";
import { ResourceForm } from "@/components/admin/resource-form";

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }): Promise<Metadata> {
  const r = getResource((await params).resource);
  return { title: r ? `Edit ${r.singular}` : "Admin" };
}

export default async function EditRecord({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource || !/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  await requireUser(resource.superAdminOnly ? "SUPER_ADMIN" : undefined);
  const record = await getRecord(resource, id);
  if (!record) notFound();
  const slug = typeof record.slug === "string" ? record.slug : "";
  return (
    <ResourceForm
      key={String(record.updatedAt)}
      mode="resource"
      resourceKey={resource.key}
      singular={resource.singular}
      label={resource.label}
      recordId={id}
      fields={resource.fields}
      initial={toFormValues(resource.fields, record)}
      options={await relationOptions(resource.fields)}
      publicUrl={resource.publicPath && slug && record.published !== false ? resource.publicPath.replace(":slug", slug) : undefined}
    />
  );
}
