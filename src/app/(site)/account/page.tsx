import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { isStaff, requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { applicationFields } from "@/lib/member-fields";
import { toFormValues } from "@/lib/admin/resource-server";
import { memberLogoutAction } from "@/actions/member-auth";
import { PageHeader } from "@/components/site/page-header";
import { MemberAvatar } from "@/components/site/cards";
import { MemberPortal, type PortalMember } from "@/components/site/member-portal";
import type { PushConfig } from "@/components/site/push-toggle";

/** Public Firebase web config; empty until the project is configured. */
function pushConfig(): PushConfig | null {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "",
  };
  return Object.values(cfg).every(Boolean) ? cfg : null;
}

export const metadata: Metadata = { title: "Member portal", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireAccount();
  if (isStaff(user.role)) redirect("/admin");

  const [account, faculty] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { member: { include: { category: true, supervisor: { select: { name: true } } } } },
    }),
    db.member.findMany({
      where: { published: true, status: "APPROVED", program: "Faculty" },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const member = account.member;
  const portalMember: PortalMember = member
    ? {
        id: member.id,
        slug: member.slug,
        status: member.status,
        reviewNote: member.reviewNote,
        published: member.published,
        categoryName: member.category?.name ?? null,
        supervisorName: member.supervisor?.name ?? null,
      }
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Member portal"
        title={`Hello, ${account.name.split(" ")[0]}`}
        subtitle="Your lab profile, attendance, notices and the lab group."
        crumbs={[{ label: "Member portal" }]}
      />
      <section className="section pt-12">
        <div className="container-page grid gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-4">
              <div className="rounded-3xl border bg-card p-6 text-center">
                <MemberAvatar
                  member={{ name: member?.name ?? account.name, photo: member?.photo ?? "" }}
                  className="mx-auto size-28 rounded-full [&_span]:text-3xl"
                />
                <p className="mt-4 text-lg font-bold">{member?.name ?? account.name}</p>
                <p className="text-sm text-muted-foreground">{member?.position || account.email}</p>
                {member?.category && (
                  <p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                    {member.category.name}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-3 rounded-3xl border bg-card p-5 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-brand-accent" />
                <p>
                  Signed in as <strong className="text-foreground">{account.email}</strong>. Your ID, phone and address are
                  visible only to you and the lab administrators.
                </p>
              </div>
              <form action={memberLogoutAction}>
                <button className="flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition hover:bg-muted">
                  <LogOut className="size-4" /> Sign out
                </button>
              </form>
            </div>
          </aside>

          <div className="lg:col-span-8">
            <MemberPortal
              pushConfig={pushConfig()}
              notifyPrefs={{ notifyChat: account.notifyChat, notifyNotices: account.notifyNotices }}
              member={portalMember}
              approved={account.active && member?.status === "APPROVED"}
              options={{ supervisor: faculty.map((f) => ({ value: f.id, label: f.name })) }}
              values={toFormValues(applicationFields, (member ?? null) as unknown as Record<string, unknown> | null)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
