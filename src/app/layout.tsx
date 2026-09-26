import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSettings } from "@/lib/settings";
import { fontVar, fontVariables } from "@/lib/fonts";
import { readableOn, safeHex } from "@/lib/theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const siteUrl = process.env.SITE_URL || "http://localhost:3000";
  const title = s.seoTitle || s.labName;
  const description = s.seoDescription || s.description || s.tagline;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${s.shortName || s.labName}` },
    description,
    keywords: s.seoKeywords ? s.seoKeywords.split(",").map((k) => k.trim()) : undefined,
    applicationName: s.labName,
    icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: s.labName,
      title,
      description,
      images: s.ogImageUrl ? [{ url: s.ogImageUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSettings();
  return { themeColor: safeHex(s.primaryColor, "#0b3b5c") };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, nonce] = await Promise.all([
    getSettings(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  const brand = safeHex(settings.primaryColor, "#0b3b5c");
  const accent = safeHex(settings.accentColor, "#14b8a6");
  // Every value here is whitelisted (hex regex / font map), so the inline
  // stylesheet cannot be used to inject arbitrary CSS.
  const themeCss = `:root{--brand:${brand};--brand-fg:${readableOn(brand)};--brand-accent:${accent};--accent-fg:${readableOn(accent)};--font-display:${fontVar(settings.headingFont, "Plus Jakarta Sans")};--font-body:${fontVar(settings.bodyFont, "Inter")};}`;

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables} data-scroll-behavior="smooth">
      <head>
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange nonce={nonce}>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
