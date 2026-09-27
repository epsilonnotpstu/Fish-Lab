"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn, Send } from "lucide-react";
import { toast } from "sonner";
import {
  loginWithPassword,
  requestLoginCode,
  restartMemberAuth,
  verifyMemberCode,
  verifyStaffCode,
  type MemberAuthState,
} from "@/actions/member-auth";
import { OtpInput } from "./otp-input";

const CODE_TTL_SECONDS = 10 * 60;

const input =
  "h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15";

export function GoogleButton({ label, inApp = false }: { label: string; inApp?: boolean }) {
  return (
    <a
      // Google refuses OAuth inside a web view, so the app opens the system
      // browser and gets handed back a session afterwards.
      href={inApp ? "/api/auth/google?app=1" : "/api/auth/google"}
      target={inApp ? "_blank" : undefined}
      rel={inApp ? "noopener noreferrer" : undefined}
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

export function MemberLoginForm({
  googleEnabled = false,
  notice,
  inApp = false,
}: {
  googleEnabled?: boolean;
  notice?: string;
  inApp?: boolean;
}) {
  const [mode, setMode] = useState<"password" | "code">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [pwState, pwAction, pwPending] = useActionState<MemberAuthState, FormData>(loginWithPassword, undefined);
  const [codeState, codeAction, codePending] = useActionState<MemberAuthState, FormData>(requestLoginCode, undefined);
  const [verifyState, verifyAction, verifying] = useActionState<MemberAuthState, FormData>(verifyMemberCode, undefined);
  const [staffState, staffAction, staffVerifying] = useActionState<MemberAuthState, FormData>(verifyStaffCode, undefined);
  const [reset, setReset] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const [cooldown, setCooldown] = useState(false);
  const sent = useRef<string | null>(null);

  const otpStep = mode === "code" && codeState?.step === "otp" && verifyState?.step !== "email" && reset === 0;

  useEffect(() => {
    if (!otpStep || !codeState?.email) return;
    const stamp = `${codeState.email}:${codeState.sentAt ?? ""}`;
    if (sent.current === stamp) return;
    sent.current = stamp;
    setSecondsLeft(CODE_TTL_SECONDS);
    toast.success("OTP sent", { description: `Check the inbox of ${codeState.email}` });
  }, [otpStep, codeState?.email, codeState?.sentAt]);

  useEffect(() => {
    if (!otpStep) return;
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [otpStep]);

  // Staff accounts with the emailed second step finish here.
  if (pwState?.step === "otp" && pwState.purpose === "staff") {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">Verification code sent to {pwState.email}</p>
            <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
              Enter the 6-digit code to finish signing in.
            </p>
          </div>
        </div>
        <form action={staffAction} className="space-y-5">
          <OtpInput name="code" autoFocus />
          {staffState?.error && (
            <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{staffState.error}</p>
          )}
          <button disabled={staffVerifying} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {staffVerifying ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Verify &amp; sign in
          </button>
        </form>
      </div>
    );
  }

  if (otpStep && codeState?.email) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">OTP sent to {codeState.email}</p>
            <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
              Enter the 6-digit code below. No code arrives if this address has no member account yet —{" "}
              <Link href="/account/signup" className="font-semibold underline underline-offset-2">create one first</Link>.
            </p>
            <p className="mt-2 font-medium">
              {secondsLeft > 0 ? (
                <>Code expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</>
              ) : (
                <>This code has expired — use “Resend code”.</>
              )}
            </p>
          </div>
        </div>
        <form action={verifyAction} className="space-y-5">
          <OtpInput name="code" autoFocus />
          {verifyState?.error && (
            <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{verifyState.error}</p>
          )}
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
              codeAction(fd);
            }}
          >
            <input type="hidden" name="email" value={codeState.email} />
            <button disabled={codePending || cooldown} className="font-medium text-brand hover:underline disabled:opacity-50 dark:text-brand-accent">
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
          <GoogleButton label="Continue with Google" inApp={inApp} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or sign in with your email <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {mode === "password" ? (
        <form action={pwAction} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input name="email" type="email" required maxLength={254} autoComplete="email" className={input} placeholder="you@pstu.ac.bd" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <span className="relative block">
              <input name="password" type={showPassword ? "text" : "password"} required maxLength={128} autoComplete="current-password" className={`${input} pr-11`} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {pwState?.error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{pwState.error}</p>}
          <button disabled={pwPending} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {pwPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in
          </button>
          <button type="button" onClick={() => setMode("code")} className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <KeyRound className="size-4" /> Forgot password? Sign in with an email code
          </button>
        </form>
      ) : (
        <form
          action={(fd) => {
            setReset(0);
            codeAction(fd);
          }}
          className="space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input name="email" type="email" required maxLength={254} autoComplete="email" className={input} placeholder="you@pstu.ac.bd" autoFocus />
          </label>
          {codeState?.error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{codeState.error}</p>}
          <button disabled={codePending} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
            {codePending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Email me a sign-in code
          </button>
          <button type="button" onClick={() => setMode("password")} className="flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground">
            Use my password instead
          </button>
        </form>
      )}

      <p className="rounded-2xl bg-muted/60 px-4 py-3 text-center text-xs text-muted-foreground">
        Members and administrators both sign in here with their email and password.
        {!inApp && (
          <>
            {" "}
            Admins can also use{" "}
            <Link href="/admin/login" className="font-medium text-foreground hover:underline">/admin</Link>.
          </>
        )}
      </p>
      <p className="text-center text-sm text-muted-foreground">
        New lab member? <Link href="/account/signup" className="font-medium text-foreground hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
