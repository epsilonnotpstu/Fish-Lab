import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { googleConfigured } from "@/lib/google-oauth";
import { isLabApp } from "@/lib/request";
import { PageHeader } from "@/components/site/page-header";
import { SignupWizard } from "@/components/site/signup-wizard";

export const metadata: Metadata = { title: "Create member account", robots: { index: false } };

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user.role) ? "/admin" : "/account");
  const settings = await getSettings();
  const inApp = await isLabApp();

  const supervisors = await db.member.findMany({
    where: { published: true, status: "APPROVED", program: "Faculty" },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title="Create your member account"
        subtitle={
          settings.memberSignupNote ||
          "Students and researchers of the lab can register here. A lab administrator approves each request."
        }
        crumbs={[{ label: "Member portal" }]}
      />
      <section className="section pt-12">
        <div className="container-page max-w-3xl">
          <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-brand/5 sm:p-10">
            <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <UserPlus className="size-5" />
            </span>
            {settings.memberSignupEnabled ? (
              <SignupWizard
                googleEnabled={googleConfigured()}
                inApp={inApp}
                supervisors={supervisors.map((m) => ({ value: m.id, label: m.name }))}
                defaults={{ faculty: settings.faculty, department: settings.department }}
              />
            ) : (
              <p className="text-muted-foreground">
                Member sign-up is currently closed. Please contact the laboratory if you need an account.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
