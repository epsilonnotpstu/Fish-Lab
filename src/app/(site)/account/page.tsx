import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck, UserRoundX } from "lucide-react";
import { isStaff, requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { getResource } from "@/lib/admin/resources";
import { toFormValues } from "@/lib/admin/resource-server";
import { memberLogoutAction } from "@/actions/member-auth";
import { PageHeader } from "@/components/site/page-header";
import { MemberAvatar } from "@/components/site/cards";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

const SELF_EDITABLE = ["photo", "phone", "bio", "researchInterests", "education", "links"];

export default async function AccountPage() {
  const user = await requireAccount();
  if (isStaff(user.role)) redirect("/admin");
  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { member: { include: { category: true } } },
  });
  const member = account.member;
  const fields = getResource("members")!.fields
    .filter((f) => SELF_EDITABLE.includes(f.name))
    .map((f) => ({ ...f, section: undefined, half: f.name === "phone" }));

  return (
    <>
      <PageHeader eyebrow="Member portal" title={`Hello, ${account.name.split(" ")[0]}`} subtitle="Keep your public profile up to date." crumbs={[{ label: "Member portal" }]} />
      <section className="section pt-12">
        <div className="container-page grid gap-8 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-4">
              <div className="rounded-3xl border bg-card p-6 text-center">
                {member ? (
                  <MemberAvatar member={member} className="mx-auto size-28 rounded-full [&_span]:text-3xl" />
                ) : (
                  <span className="mx-auto grid size-28 place-items-center rounded-full bg-muted"><UserRoundX className="size-10 text-muted-foreground" /></span>
                )}
                <p className="mt-4 text-lg font-bold">{member?.name ?? account.name}</p>
                <p className="text-sm text-muted-foreground">{member?.position || account.email}</p>
                {member?.category && <p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{member.category.name}</p>}
              </div>
              <div className="flex items-start gap-3 rounded-3xl border bg-card p-5 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-brand-accent" />
                <p>You sign in with a one-time code sent to <strong className="text-foreground">{account.email}</strong>. Your name, position and group are managed by the lab administrators.</p>
              </div>
              <form action={memberLogoutAction}>
                <button className="flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition hover:bg-muted">
                  <LogOut className="size-4" /> Sign out
                </button>
              </form>
            </div>
          </aside>
          <div className="lg:col-span-8">
            {member ? (
              <>
                <h2 className="mb-6 text-2xl font-bold">Edit your profile</h2>
                <ResourceForm
                  key={member.updatedAt.toISOString()}
                  mode="profile"
                  resourceKey="members"
                  singular="Profile"
                  label="Profile"
                  recordId={member.id}
                  fields={fields}
                  initial={toFormValues(fields, member as unknown as Record<string, unknown>)}
                  options={{}}
                  publicUrl={member.published ? `/members/${member.slug}` : undefined}
                />
              </>
            ) : (
              <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
                <UserRoundX className="mx-auto size-10 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-bold">Your account is not linked to a profile yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  A lab administrator needs to link your account to your member profile. Once linked you can edit your photo, biography, research interests and links here.
                </p>
                <Link href="/contact" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Contact the lab</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
