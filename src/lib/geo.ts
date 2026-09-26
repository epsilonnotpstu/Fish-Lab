/** Great-circle distance between two points, in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export const LAB_TIME_ZONE = process.env.LAB_TIME_ZONE || "Asia/Dhaka";

/** yyyy-mm-dd in the laboratory's own timezone, used as the attendance day key. */
export function labDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function labTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LAB_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function hoursBetween(from: Date, to: Date) {
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 10) / 10);
}
