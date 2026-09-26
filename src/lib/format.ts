import { format } from "date-fns";

export function formatDate(date: Date | string | null | undefined, pattern = "MMM d, yyyy") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return format(d, pattern);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const HONORIFICS = new Set(["prof", "dr", "mr", "mrs", "ms", "md", "engr", "prof.", "dr.", "md."]);

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !HONORIFICS.has(part.toLowerCase().replace(/\.$/, "")))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function isSafeHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href.trim());
}

export function stripHtmlSafe(html: string) {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}
