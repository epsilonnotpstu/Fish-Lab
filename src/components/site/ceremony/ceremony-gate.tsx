import { cookies, headers } from "next/headers";
import { getSettings } from "@/lib/settings";
import { ceremonyArmed, ceremonyContent, CEREMONY_COOKIE } from "@/lib/inauguration";
import { CeremonyScreen } from "./ceremony-screen";

/**
 * Shown instead of the public site until the website has been inaugurated.
 * The admin area and the member portal stay reachable the whole time.
 */
export async function CeremonyGate({ armed }: { armed: boolean }) {
  const [settings, search, jar] = await Promise.all([
    getSettings(),
    headers().then((h) => h.get("x-search") ?? ""),
    cookies(),
  ]);
  const keyParam = new URLSearchParams(search).get("key") ?? "";
  const cookieKey = jar.get(CEREMONY_COOKIE)?.value ?? "";

  return (
    <CeremonyScreen
      content={ceremonyContent(settings)}
      armed={armed}
      ceremonyKey={keyParam || cookieKey}
      alreadyDone={null}
    />
  );
}
