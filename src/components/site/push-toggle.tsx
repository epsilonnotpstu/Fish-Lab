"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { registerPushToken, sendTestPush } from "@/actions/push";
import { updateNotificationPrefs } from "@/actions/member-auth";
import { Switch } from "@/components/ui/switch";

export type PushConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

async function requestToken(config: PushConfig) {
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  if (!(await isSupported())) throw new Error("This browser does not support push notifications.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const app = getApps()[0] ?? initializeApp(config);
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  const token = await getToken(getMessaging(app), {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("Could not create a device token.");
  return token;
}

export function PushToggle({
  config,
  prefs,
}: {
  config: PushConfig | null;
  prefs: { notifyChat: boolean; notifyNotices: boolean };
}) {
  // Starts unknown so the server and client render the same thing; the real
  // permission is checked when the member taps the button.
  const [state, setState] = useState<"unknown" | "on" | "blocked">("unknown");
  const [busy, start] = useTransition();
  const [options, setOptions] = useState(prefs);

  const enable = () =>
    start(async () => {
      if (!config) return;
      try {
        const token = await requestToken(config);
        const res = await registerPushToken({
          token,
          platform: "WEB",
          deviceName: navigator.userAgent.slice(0, 100),
        });
        if (!res.ok) throw new Error(res.error ?? "Could not register this device.");
        setState("on");
        toast.success("Notifications enabled on this device");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not enable notifications");
        if (typeof Notification !== "undefined" && Notification.permission === "denied") setState("blocked");
      }
    });

  const savePrefs = (next: { notifyChat: boolean; notifyNotices: boolean }) =>
    start(async () => {
      setOptions(next);
      await updateNotificationPrefs(next);
    });

  const test = () =>
    start(async () => {
      const res = await sendTestPush();
      if (res.ok) toast.success("Test notification sent");
      else toast.error(res.error ?? "Could not send the test");
    });

  return (
    <section className="rounded-3xl border bg-card p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <BellRing className="size-4" /> Notifications
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get an alert when the lab posts a notice or a new message arrives in the group.
      </p>

      {!config ? (
        <p className="mt-5 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Push notifications are not configured for this site yet.
        </p>
      ) : state === "blocked" ? (
        <p className="mt-5 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Notifications are blocked in your browser settings. Allow them for this site and reload the page.
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : state === "on" ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            {state === "on" ? "Notifications on — re-register this device" : "Enable notifications"}
          </button>
          {state === "on" && (
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition hover:bg-muted disabled:opacity-60"
            >
              <Send className="size-4" /> Send a test
            </button>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3 border-t pt-5">
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>
            <span className="block font-medium">Lab group messages</span>
            <span className="block text-xs text-muted-foreground">At most one alert per minute.</span>
          </span>
          <Switch
            checked={options.notifyChat}
            onCheckedChange={(v) => savePrefs({ ...options, notifyChat: v })}
          />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          <span>
            <span className="block font-medium">Notices from the lab</span>
            <span className="block text-xs text-muted-foreground">Announcements published by the administrators.</span>
          </span>
          <Switch
            checked={options.notifyNotices}
            onCheckedChange={(v) => savePrefs({ ...options, notifyNotices: v })}
          />
        </label>
      </div>
    </section>
  );
}
