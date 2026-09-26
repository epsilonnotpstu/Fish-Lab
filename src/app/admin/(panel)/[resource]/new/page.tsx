import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { relationOptions, toFormValues } from "@/lib/admin/resource-server";
import { ResourceForm } from "@/components/admin/resource-form";

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }): Promise<Metadata> {
  const r = getResource((await params).resource);
  return { title: r ? `New ${r.singular}` : "Admin" };
}

export default async function NewRecord({ params }: { params: Promise<{ resource: string }> }) {
  const resource = getResource((await params).resource);
  if (!resource) notFound();
  await requireUser(resource.superAdminOnly ? "SUPER_ADMIN" : undefined);
  return (
    <ResourceForm
      mode="resource"
      resourceKey={resource.key}
      singular={resource.singular}
      label={resource.label}
      recordId={null}
      fields={resource.fields}
      initial={toFormValues(resource.fields, null)}
      options={await relationOptions(resource.fields)}
    />
  );
}
