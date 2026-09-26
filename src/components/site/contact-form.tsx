"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { submitContact, type ContactState } from "@/actions/contact";
import { cn } from "@/lib/utils";

const input =
  "w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15";

export function ContactForm({ types }: { types: string[] }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, undefined);
  // Time of first interaction; instant submissions are treated as bots.
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center rounded-3xl border bg-card p-10 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </span>
        <h3 className="mt-6 text-2xl font-bold">Thank you!</h3>
        <p className="mt-2 max-w-sm text-muted-foreground">Your message has been sent. We will get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("t", String(startedAt.current));
        return action(fd);
      }}
      onFocusCapture={() => {
        if (!startedAt.current) startedAt.current = Date.now();
      }}
      className="space-y-5 rounded-3xl border bg-card p-6 sm:p-10"
    >
      {/* Honeypot: hidden from people, tempting for bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Name *</span>
          <input name="name" required maxLength={120} autoComplete="name" className={input} placeholder="Your full name" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email *</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={input} placeholder="you@example.com" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {types.length > 0 && (
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Inquiry type</span>
            <select name="type" className={input} defaultValue="">
              <option value="">Select…</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        )}
        <label className={cn("block", types.length === 0 && "sm:col-span-2")}>
          <span className="mb-2 block text-sm font-medium">Subject</span>
          <input name="subject" maxLength={200} className={input} placeholder="How can we help?" />
        </label>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Message *</span>
        <textarea name="message" required minLength={10} maxLength={5000} rows={6} className={cn(input, "resize-y")} placeholder="Write your message…" />
      </label>
      {state?.error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
