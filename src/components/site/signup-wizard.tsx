"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Send, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import {
  resendApplicationCode,
  startApplication,
  verifyMemberCode,
  type MemberAuthState,
} from "@/actions/member-auth";
import { academicFields, contactFields, profileFields } from "@/lib/member-fields";
import { cn } from "@/lib/utils";
import { FieldsGrid, type Options, type Values } from "@/components/fields/field-renderer";
import { OtpInput } from "./otp-input";
import { GoogleButton } from "./member-auth-form";

const STEPS = ["Account", "Academic", "Contact", "Profile", "Verify"] as const;
const CODE_TTL_SECONDS = 10 * 60;

const input =
  "h-12 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15";

export function SignupWizard({
  googleEnabled,
  inApp = false,
  supervisors,
  defaults,
}: {
  googleEnabled: boolean;
  inApp?: boolean;
  supervisors: { value: string; label: string }[];
  defaults: { faculty: string; department: string };
}) {
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState({ name: "", email: "", password: "", confirm: "" });
  const [profile, setProfile] = useState<Values>(() => ({
    program: "",
    session: "",
    semester: "",
    faculty: defaults.faculty,
    department: defaults.department,
    studentId: "",
    registrationNo: "",
    supervisor: "",
    phone: "",
    whatsapp: "",
    bloodGroup: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    photo: "",
    bio: "",
    researchInterests: "",
    skills: [],
    education: "",
    links: [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sending, startSending] = useTransition();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const [cooldown, setCooldown] = useState(false);
  const website = useRef(""); // honeypot

  const [verifyState, verifyAction, verifying] = useActionState<MemberAuthState, FormData>(verifyMemberCode, undefined);

  const options: Options = useMemo(() => ({ supervisor: supervisors }), [supervisors]);

  useEffect(() => {
    if (!sentEmail) return;
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [sentEmail]);

  const setField = (name: string, value: unknown) => {
    setProfile((p) => ({ ...p, [name]: value }));
    setErrors((e) => {
      if (!(name in e)) return e;
      const rest = { ...e };
      delete rest[name];
      return rest;
    });
  };

  const accountValid = () => {
    const next: Record<string, string> = {};
    if (account.name.trim().length < 2) next.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim())) next.email = "Enter a valid email address.";
    if (account.password.length < 10) next.password = "At least 10 characters.";
    else if (!/[a-z]/.test(account.password) || !/[A-Z]/.test(account.password) || !/\d/.test(account.password)) {
      next.password = "Use upper-case, lower-case letters and a number.";
    }
    if (account.password !== account.confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const requiredForStep = (index: number) => {
    const next: Record<string, string> = {};
    if (index === 1 && !profile.program) next.program = "Please choose your program or role.";
    if (index === 2 && !String(profile.phone ?? "").trim()) next.phone = "Please enter a phone number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    setFormError(null);
    if (step === 0 && !accountValid()) return;
    if (!requiredForStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = () =>
    startSending(async () => {
      setFormError(null);
      const res = await startApplication({
        account: { name: account.name, email: account.email, password: account.password },
        profile,
        website: website.current,
      });
      if (res.ok) {
        setSentEmail(res.email ?? account.email);
        setSecondsLeft(CODE_TTL_SECONDS);
        setStep(STEPS.length - 1);
        toast.success("OTP sent", { description: `Check the inbox of ${res.email ?? account.email}` });
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error ?? "Could not submit your application.");
      // Jump back to the step that holds the first problem.
      const bad = Object.keys(res.fieldErrors ?? {})[0];
      if (bad) {
        if (["name", "email", "password", "confirm"].includes(bad)) setStep(0);
        else if (academicFields.some((f) => f.name === bad)) setStep(1);
        else if (contactFields.some((f) => f.name === bad)) setStep(2);
        else setStep(3);
      }
    });

  const resend = () =>
    startSending(async () => {
      if (!sentEmail) return;
      const res = await resendApplicationCode(sentEmail);
      if (res.ok) {
        setSecondsLeft(CODE_TTL_SECONDS);
        setCooldown(true);
        setTimeout(() => setCooldown(false), 30_000);
        toast.success("OTP sent again", { description: `Check the inbox of ${sentEmail}` });
      } else toast.error(res.error ?? "Could not resend the code.");
    });

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-[11px]",
                i < step && "border-brand-accent bg-brand-accent text-accent-fg",
                i === step && "border-brand bg-brand text-brand-fg",
                i > step && "text-muted-foreground",
              )}
            >
              {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
            </span>
            <span className={cn(i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-border sm:w-8" />}
          </li>
        ))}
      </ol>

      {formError && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</p>
      )}

      {step === 0 && (
        <div className="space-y-5">
          {googleEnabled && (
            <>
              <GoogleButton label="Sign up with Google" inApp={inApp} />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or use your email <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium">Full name *</span>
              <input className={input} value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="Your full name" autoComplete="name" />
              {errors.name && <span className="mt-1 block text-xs text-destructive">{errors.name}</span>}
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-medium">Email *</span>
              <input className={input} type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="you@pstu.ac.bd" autoComplete="email" />
              {errors.email && <span className="mt-1 block text-xs text-destructive">{errors.email}</span>}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password *</span>
              <span className="relative block">
                <input className={cn(input, "pr-11")} type={showPassword ? "text" : "password"} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
              {errors.password ? (
                <span className="mt-1 block text-xs text-destructive">{errors.password}</span>
              ) : (
                <span className="mt-1 block text-xs text-muted-foreground">At least 10 characters, with upper, lower and a number.</span>
              )}
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Confirm password *</span>
              <input className={input} type="password" value={account.confirm} onChange={(e) => setAccount({ ...account, confirm: e.target.value })} autoComplete="new-password" />
              {errors.confirm && <span className="mt-1 block text-xs text-destructive">{errors.confirm}</span>}
            </label>
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
            <input type="text" tabIndex={-1} autoComplete="off" onChange={(e) => (website.current = e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <FieldsGrid fields={academicFields} values={profile} errors={errors} options={options} onChange={setField} />
      )}
      {step === 2 && <FieldsGrid fields={contactFields} values={profile} errors={errors} onChange={setField} />}
      {step === 3 && (
        <>
          <p className="text-sm text-muted-foreground">
            This part is optional — you can complete it later from the member portal.
          </p>
          <FieldsGrid fields={profileFields} values={profile} errors={errors} onChange={setField} />
        </>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="font-semibold">OTP sent to {sentEmail}</p>
              <p className="mt-1 text-emerald-800/80 dark:text-emerald-300/80">
                Enter the 6-digit code to finish creating your account. Check your spam folder if it does not arrive within a minute.
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
              {verifying ? <Loader2 className="size-4 animate-spin" /> : <UserRoundCheck className="size-4" />}
              Verify & create account
            </button>
          </form>
          <button type="button" onClick={resend} disabled={sending || cooldown} className="text-sm font-medium text-brand hover:underline disabled:opacity-50 dark:text-brand-accent">
            Resend code
          </button>
        </div>
      )}

      {step < 4 && (
        <div className="flex items-center justify-between gap-3 border-t pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground", step === 0 && "invisible")}
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={goNext} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={sending} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit application
            </button>
          )}
        </div>
      )}

      <p className="rounded-2xl bg-muted/60 px-4 py-3 text-center text-xs text-muted-foreground">
        A lab administrator reviews every request. Admins and editors sign in at{" "}
        <Link href="/admin/login" className="font-medium text-foreground hover:underline">/admin</Link> instead.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/account/login" className="font-medium text-foreground hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
