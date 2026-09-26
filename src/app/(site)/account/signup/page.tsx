import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { PageHeader } from "@/components/site/page-header";
import { MemberAuthForm } from "@/components/site/member-auth-form";
import { googleConfigured } from "@/lib/google-oauth";

const NOTICES: Record<string, string> = {
  staff: "This email belongs to a staff account. Please sign in at /admin with your password.",
  disabled: "This account has been disabled. Please contact the lab.",
  google_cancelled: "Google sign-in was cancelled.",
  google_expired: "Your sign-in session expired. Please try again.",
  google_state: "Sign-in could not be verified. Please try again.",
  google_failed: "Google sign-in failed. Please try again or use an email code.",
  google_off: "Google sign-in is not available right now. Please use an email code.",
  rate: "Too many attempts. Please wait a few minutes and try again.",
};

export const metadata: Metadata = { title: "Create member account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user.role) ? "/admin" : "/account");
  return (
    <>
      <PageHeader eyebrow="Member portal" title="Create member account" subtitle="Lab members can manage their own public profile. We will verify your email with a one-time code." crumbs={[{ label: "Member portal" }]} />
      <section className="section pt-12">
        <div className="container-page max-w-md">
          <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-brand/5 sm:p-8">
            <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><KeyRound className="size-5" /></span>
            <MemberAuthForm mode="signup" googleEnabled={googleConfigured()} notice={error ? NOTICES[error] : undefined} />
          </div>
        </div>
      </section>
    </>
  );
}
