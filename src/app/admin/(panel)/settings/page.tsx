import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { settingsFields } from "@/lib/admin/resources";
import { toFormValues } from "@/lib/admin/resource-server";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata: Metadata = { title: "Site settings" };

export default async function SettingsPage() {
  await requireUser("SUPER_ADMIN");
  const settings = await getSettings();
  return (
    <ResourceForm
      key={settings.updatedAt.toISOString()}
      mode="settings"
      resourceKey="settings"
      singular="Settings"
      label="Website"
      recordId={null}
      fields={settingsFields}
      initial={toFormValues(settingsFields, settings as unknown as Record<string, unknown>)}
      options={{}}
      publicUrl="/"
    />
  );
}
