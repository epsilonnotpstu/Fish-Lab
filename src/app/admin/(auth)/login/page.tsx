import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LabLogo } from "@/components/site/lab-logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  const s = await getSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-ocean relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid absolute inset-0 text-white opacity-30" />
        <div className="absolute -right-32 -bottom-32 size-[28rem] rounded-full bg-brand-accent/25 blur-3xl" />
        <div className="relative"><LabLogo brand={s} light /></div>
        <div className="relative max-w-md">
          <p className="eyebrow mb-4">Content management</p>
          <h1 className="text-4xl leading-tight font-bold">Manage everything on the {s.shortName || s.labName} website from one place.</h1>
          <p className="mt-4 text-white/70">Research, people, news, publications, pages, branding and more — no code required.</p>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck className="size-4" /> Protected area. All sign-in attempts are logged.
        </p>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><LabLogo brand={s} /></div>
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the admin panel.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
