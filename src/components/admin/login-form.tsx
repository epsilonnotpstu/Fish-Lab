"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn, MailCheck } from "lucide-react";
import { cancelOtpAction, loginAction, verifyAdminCodeAction, type FormState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/site/otp-input";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, undefined);
  const [otpState, otpAction, otpPending] = useActionState<FormState, FormData>(verifyAdminCodeAction, undefined);
  const [show, setShow] = useState(false);
  const [back, setBack] = useState(0);

  const onOtpStep = (state?.step === "otp" || otpState?.step === "otp") && back === 0;

  if (onOtpStep && state?.step === "otp") {
    return (
      <form action={otpAction} className="mt-8 space-y-5">
        <div className="flex gap-3 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
          <MailCheck className="size-5 shrink-0" />
          <p>We sent a 6-digit code to <strong>{state.email}</strong>. Enter it to finish signing in.</p>
        </div>
        <OtpInput name="code" autoFocus />
        {otpState?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{otpState.error}</p>}
        <Button type="submit" disabled={otpPending} className="h-11 w-full">
          {otpPending ? <Loader2 className="animate-spin" /> : <LogIn />} Verify & sign in
        </Button>
        <button
          type="button"
          onClick={async () => {
            await cancelOtpAction();
            setBack((b) => b + 1);
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Use a different account
        </button>
      </form>
    );
  }

  return (
    <form action={(fd) => { setBack(0); return action(fd); }} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="h-11" autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="h-11 pr-10" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-11 w-full text-sm">
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Lab member? <a href="/account/login" className="font-medium text-foreground underline-offset-2 hover:underline">Sign in to the member portal</a>
      </p>
    </form>
  );
}
