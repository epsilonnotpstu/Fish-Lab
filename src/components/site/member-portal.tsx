"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  Clock3,
  ExternalLink,
  Loader2,
  Lock,
  MessagesSquare,
  Save,
  ShieldAlert,
  Smartphone,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeOwnPassword,
  resubmitApplication,
  submitApplication,
  updateOwnProfile,
} from "@/actions/member-auth";
import { applicationFields, memberEditableFields, memberReadOnlyFields } from "@/lib/member-fields";
import { cn } from "@/lib/utils";
import { FieldsGrid, groupBySection, type Options, type Values } from "@/components/fields/field-renderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PushToggle, type PushConfig } from "./push-toggle";

export type PortalMember = {
  id: string;
  slug: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string;
  published: boolean;
  categoryName: string | null;
  supervisorName: string | null;
} | null;

const input =
  "h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15";

function StatusBanner({ member }: { member: NonNullable<PortalMember> }) {
  if (member.status === "APPROVED") {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-300">
        <BadgeCheck className="size-5 shrink-0" />
        <div>
          <p className="font-semibold">Your membership is approved</p>
          <p className="mt-1">
            Your profile is listed on the public members page.{" "}
            <Link href={`/members/${member.slug}`} className="font-semibold underline underline-offset-2">View it</Link>
          </p>
        </div>
      </div>
    );
  }
  if (member.status === "PENDING") {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-300">
        <Clock3 className="size-5 shrink-0" />
        <div>
          <p className="font-semibold">Waiting for approval</p>
          <p className="mt-1">
            A lab administrator is reviewing your request. You can keep editing your details in the meantime — the lab
            group, attendance and notices unlock as soon as you are approved.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
      <ShieldAlert className="size-5 shrink-0" />
      <div>
        <p className="font-semibold">Your request was not approved</p>
        {member.reviewNote && <p className="mt-1">Note from the lab: {member.reviewNote}</p>}
        <p className="mt-1">Update your details below and send the request again.</p>
      </div>
    </div>
  );
}

export function MemberPortal({
  member,
  values,
  options,
  approved,
  pushConfig,
  notifyPrefs,
}: {
  member: PortalMember;
  values: Values;
  options: Options;
  approved: boolean;
  pushConfig: PushConfig | null;
  notifyPrefs: { notifyChat: boolean; notifyNotices: boolean };
}) {
  const router = useRouter();
  const [form, setForm] = useState<Values>(values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, startPassword] = useTransition();

  const setField = (name: string, value: unknown) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => {
      if (!(name in e)) return e;
      const rest = { ...e };
      delete rest[name];
      return rest;
    });
  };

  const save = () =>
    startSaving(async () => {
      const fields = member ? memberEditableFields : applicationFields;
      const payload = Object.fromEntries(fields.map((f) => [f.name, form[f.name]]));
      const res = member ? await updateOwnProfile(payload) : await submitApplication(payload);
      if (res.ok) {
        setErrors({});
        toast.success(member ? "Profile saved" : "Application submitted — the lab will review it");
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error ?? "Could not save");
      }
    });

  const resubmit = () =>
    startSaving(async () => {
      const res = await resubmitApplication();
      if (res.ok) {
        toast.success("Sent for review again");
        router.refresh();
      } else toast.error(res.error ?? "Could not send");
    });

  const savePassword = () =>
    startPassword(async () => {
      const res = await changeOwnPassword(password);
      if (res.ok) {
        setPassword({ current: "", next: "", confirm: "" });
        toast.success("Password updated");
      } else toast.error(res.error ?? "Could not update password");
    });

  // No profile yet (e.g. signed up with Google): ask for the full application.
  if (!member) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-3xl border bg-card p-5 text-sm">
          <UserRoundCheck className="size-5 shrink-0 text-brand-accent" />
          <div>
            <p className="font-semibold">One more step</p>
            <p className="mt-1 text-muted-foreground">
              Fill in your academic and contact details so a lab administrator can approve your membership.
            </p>
          </div>
        </div>
        {groupBySection(applicationFields, "Details").map(([section, fields]) => (
          <section key={section} className="rounded-3xl border bg-card p-6 sm:p-8">
            <h2 className="mb-6 text-lg font-bold">{section}</h2>
            <FieldsGrid fields={fields} values={form} errors={errors} options={options} onChange={setField} />
          </section>
        ))}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Submit application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatusBanner member={member} />

      {approved && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/account/attendance" className="group flex items-center gap-3 rounded-3xl border bg-card p-5 transition hover:border-brand-accent/50 hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><CalendarCheck className="size-5" /></span>
            <span>
              <span className="block font-semibold">Attendance</span>
              <span className="block text-xs text-muted-foreground">Mark that you are in the lab</span>
            </span>
          </Link>
          <Link href="/account/chat" className="group flex items-center gap-3 rounded-3xl border bg-card p-5 transition hover:border-brand-accent/50 hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><MessagesSquare className="size-5" /></span>
            <span>
              <span className="block font-semibold">Lab group</span>
              <span className="block text-xs text-muted-foreground">Chat with the lab</span>
            </span>
          </Link>
          <Link href="/app" className="group flex items-center gap-3 rounded-3xl border bg-card p-5 transition hover:border-brand-accent/50 hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><Smartphone className="size-5" /></span>
            <span>
              <span className="block font-semibold">Android app</span>
              <span className="block text-xs text-muted-foreground">Install on your phone</span>
            </span>
          </Link>
          <Link href="/account/notices" className="group flex items-center gap-3 rounded-3xl border bg-card p-5 transition hover:border-brand-accent/50 hover:shadow-md">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><ExternalLink className="size-5" /></span>
            <span>
              <span className="block font-semibold">Notices</span>
              <span className="block text-xs text-muted-foreground">Lab announcements</span>
            </span>
          </Link>
        </div>
      )}

      <Tabs defaultValue="profile" className="gap-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {groupBySection(memberEditableFields, "Details").map(([section, fields]) => (
            <section key={section} className="rounded-3xl border bg-card p-6 sm:p-8">
              <h2 className="mb-6 text-lg font-bold">{section}</h2>
              <FieldsGrid fields={fields} values={form} errors={errors} options={options} onChange={setField} />
            </section>
          ))}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {member.status === "REJECTED" && (
              <button onClick={resubmit} disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-full border px-6 text-sm font-semibold transition hover:bg-muted disabled:opacity-60">
                Send for review again
              </button>
            )}
            <button onClick={save} disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
            </button>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold">Academic details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These are managed by the lab administrators. Ask them if something needs to change.
            </p>
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {memberReadOnlyFields.map((f) => (
                <div key={f.name} className="border-b pb-3">
                  <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{f.label}</dt>
                  <dd className="mt-1 text-sm font-medium">
                    {f.name === "supervisor" ? member.supervisorName || "—" : String(form[f.name] || "") || "—"}
                  </dd>
                </div>
              ))}
              <div className="border-b pb-3">
                <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Member group</dt>
                <dd className="mt-1 text-sm font-medium">{member.categoryName || "—"}</dd>
              </div>
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {approved && <PushToggle config={pushConfig} prefs={notifyPrefs} />}
          <section className="rounded-3xl border bg-card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Lock className="size-4" /> Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              At least 10 characters with upper-case, lower-case letters and a number.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Current password</span>
                <input type="password" className={input} value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} autoComplete="current-password" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">New password</span>
                <input type="password" className={input} value={password.next} onChange={(e) => setPassword({ ...password, next: e.target.value })} autoComplete="new-password" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Confirm new password</span>
                <input type="password" className={input} value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} autoComplete="new-password" />
              </label>
            </div>
            <button onClick={savePassword} disabled={pwSaving} className={cn("mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60")}>
              {pwSaving ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} Update password
            </button>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
