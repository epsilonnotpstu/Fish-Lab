import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { getCurrentUser, isStaff } from "./auth";
import { getSettings, type Settings } from "./settings";

export const CEREMONY_COOKIE = "lab_ceremony";

export type CeremonyContent = {
  title: string;
  subtitle: string;
  guestName: string;
  guestTitle: string;
  date: string;
  buttonLabel: string;
  note: string;
  labName: string;
  shortName: string;
  department: string;
  university: string;
  logo: string;
};

export function ceremonyContent(s: Settings): CeremonyContent {
  return {
    title: s.ceremonyTitle || `Inauguration of the ${s.labName} website`,
    subtitle: s.ceremonySubtitle || s.tagline,
    guestName: s.ceremonyGuestName,
    guestTitle: s.ceremonyGuestTitle,
    date: s.ceremonyDate,
    buttonLabel: s.ceremonyButtonLabel || "Inaugurate",
    note: s.ceremonyNote,
    labName: s.labName,
    shortName: s.shortName,
    department: s.department,
    university: s.university,
    logo: s.logoDarkUrl || s.logoUrl,
  };
}

function sameKey(a: string, b: string) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * The ceremony button only works for the guest's own link (or for staff, so the
 * ceremony can be rehearsed). Everyone else just sees the waiting screen.
 */
export async function ceremonyArmed(settings: Settings, keyFromUrl?: string) {
  if (!settings.inaugurationKey) return false;
  if (keyFromUrl && sameKey(keyFromUrl, settings.inaugurationKey)) return true;
  const cookie = (await cookies()).get(CEREMONY_COOKIE)?.value ?? "";
  if (sameKey(cookie, settings.inaugurationKey)) return true;
  const user = await getCurrentUser();
  return Boolean(user && isStaff(user.role));
}

/** True while the public site should show the ceremony instead of the pages. */
export async function ceremonyPending() {
  const settings = await getSettings();
  return settings.inaugurationEnabled && !settings.inauguratedAt;
}
