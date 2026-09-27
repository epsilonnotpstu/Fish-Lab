import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ceremonyContent } from "@/lib/inauguration";
import { formatDate } from "@/lib/format";
import { PageTitle } from "@/components/admin/page-title";
import { InaugurationPanel } from "@/components/admin/inauguration-panel";

export const metadata: Metadata = { title: "Inauguration" };

export default async function AdminInaugurationPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const site = (process.env.SITE_URL || "https://aalabfst.org").replace(/\/$/, "");

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Website inauguration"
        description="Run the ceremony: open the waiting screen, hand the chief guest their link, and let them launch the website."
      />
      <InaugurationPanel
        superAdmin={user.role === "SUPER_ADMIN"}
        enabled={settings.inaugurationEnabled}
        inauguratedAt={settings.inauguratedAt ? formatDate(settings.inauguratedAt, "d MMMM yyyy, h:mm a") : null}
        ceremonyLink={settings.inaugurationKey ? `${site}/?key=${settings.inaugurationKey}` : ""}
        content={ceremonyContent(settings)}
      />
    </div>
  );
}
