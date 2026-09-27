import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { CalendarCheck, Download, MessagesSquare, Megaphone, Smartphone, UserRound } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { isSafeHref } from "@/lib/format";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = { title: "Android app" };

const FEATURES = [
  { icon: CalendarCheck, title: "Attendance", text: "Mark that you are in the lab and check out when you leave." },
  { icon: MessagesSquare, title: "Lab group", text: "Messages, photos, files and voice notes with the whole lab." },
  { icon: Megaphone, title: "Notices", text: "Announcements from the lab, as soon as they are published." },
  { icon: UserRound, title: "Your profile", text: "Keep your details, photo and research interests up to date." },
];

export default async function AppDownloadPage() {
  const settings = await getSettings();
  const apk = isSafeHref(settings.appApkUrl) ? settings.appApkUrl : "";
  const qr = apk
    ? await QRCode.toString(apk, { type: "svg", margin: 1, width: 180, color: { dark: "#0b3b5c", light: "#ffffff" } })
    : "";

  return (
    <>
      <PageHeader
        eyebrow="Member app"
        title="The lab in your pocket"
        subtitle="Install the Android app to mark attendance, follow notices and stay in the lab group."
        crumbs={[{ label: "Android app" }]}
      />
      <section className="section pt-12">
        <div className="container-page grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold">What you can do</h2>
            <ul className="mt-6 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4 rounded-2xl border bg-card p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <f.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{f.title}</span>
                    <span className="block text-sm text-muted-foreground">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              Sign in with the same email and password you use on this website — members and administrators both.{" "}
              <Link href="/account/signup" className="font-medium text-brand hover:underline dark:text-brand-accent">
                Create an account
              </Link>{" "}
              if you do not have one yet.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-accent text-white">
                <Smartphone className="size-6" />
              </span>
              <div>
                <p className="font-bold">{settings.shortName || settings.labName} for Android</p>
                <p className="text-xs text-muted-foreground">
                  {settings.appVersion ? `Version ${settings.appVersion}` : "Latest build"} · Android 6.0 and newer
                </p>
              </div>
            </div>

            {apk ? (
              <>
                <a
                  href={apk}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  <Download className="size-5" /> Download the app (APK)
                </a>
                {qr && (
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <div
                      className="rounded-2xl border bg-white p-3 [&_svg]:size-40"
                      // Generated from the download link by the qrcode library.
                      dangerouslySetInnerHTML={{ __html: qr }}
                    />
                    <p className="text-xs text-muted-foreground">Scan with your phone camera to download</p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-6 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                The app download will appear here shortly.
              </p>
            )}

            <ol className="mt-8 space-y-3 border-t pt-6 text-sm text-muted-foreground">
              {[
                "Tap the download button on your Android phone.",
                "Open the downloaded file. Android will ask for permission to install apps from this source — allow it once.",
                "Tap Install, then open the app and sign in.",
                "Allow location when you first mark attendance, and the microphone if you send voice notes.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs text-muted-foreground">
              An iPhone version is not available yet — on iOS, open this website in Safari and use “Add to Home Screen”.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
