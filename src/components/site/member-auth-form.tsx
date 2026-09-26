"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import {
  requestLoginCode,
  requestSignupCode,
  restartMemberAuth,
  verifyMemberCode,
  type MemberAuthState,
} from "@/actions/member-auth";
import { OtpInput } from "./otp-input";

const input =
  "h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15";

export function GoogleButton({ label }: { label: string }) {
  return (
    <a
      href="/api/auth/google"
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border bg-background text-sm font-semibold transition hover:bg-muted"
    >
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {label}
    </a>
  );
}

export function MemberAuthForm({ mode, googleEnabled = false, notice }: { mode: "login" | "signup"; googleEnabled?: boolean; notice?: string }) {
  const [reqState, requestAction, requesting] = useActionState<MemberAuthState, FormData>(
    mode === "signup" ? requestSignupCode : requestLoginCode,
    undefined,
  );
  const [verifyState, verifyAction, verifying] = useActionState<MemberAuthState, FormData>(verifyMemberCode, undefined);
  const [reset, setReset] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  const otpStep = reqState?.step === "otp" && verifyState?.step !== "email" && reset === 0;
  const error = otpStep ? verifyState?.error : (verifyState?.step === "email" ? verifyState.error : undefined) ?? reqState?.error;

  if (otpStep) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
          <MailCheck className="size-5 shrink-0" />
          <p>
            If <strong>{reqState.email}</strong> {mode === "login" ? "has a member account" : "can receive email"}, a 6-digit code is on its way.
            Check your inbox (and spam folder).
          </p>
        </div>
        <form action={verifyAction} className="space-y-5">
          <OtpInput name="code" autoFocus />
          {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
          <button disabled={verifying} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {verifying && <Loader2 className="size-4 animate-spin" />} Verify code
          </button>
        </form>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={async () => {
              await restartMemberAuth();
              setReset((r) => r + 1);
            }}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Change email
          </button>
          <form
            action={(fd) => {
              setCooldown(true);
              setTimeout(() => setCooldown(false), 30_000);
              requestAction(fd);
            }}
          >
            <input type="hidden" name="email" value={reqState.email} />
            {mode === "signup" && <input type="hidden" name="name" value={String(reqState.email).split("@")[0]} />}
            <button disabled={requesting || cooldown} className="font-medium text-brand hover:underline disabled:opacity-50 dark:text-brand-accent">
              Resend code
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notice && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{notice}</p>}
      {googleEnabled && (
        <>
          <GoogleButton label={mode === "signup" ? "Sign up with Google" : "Continue with Google"} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or use a one-time email code <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
    <form
      action={(fd) => {
        setReset(0);
        requestAction(fd);
      }}
      className="space-y-5"
    >
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {mode === "signup" && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Full name</span>
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} placeholder="Your name" />
        </label>
      )}
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Email</span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" className={input} placeholder="you@university.edu" autoFocus />
      </label>
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      <button disabled={requesting} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
        {requesting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {mode === "signup" ? "Create account" : "Email me a sign-in code"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>Already have an account? <Link href="/account/login" className="font-medium text-foreground hover:underline">Sign in</Link></>
        ) : (
          <>New lab member? <Link href="/account/signup" className="font-medium text-foreground hover:underline">Create an account</Link></>
        )}
      </p>
    </form>
    </div>
  );
}
