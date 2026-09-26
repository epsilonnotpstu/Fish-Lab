export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(sp: Record<string, string | string[] | undefined>, key: string, max = 100) {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.slice(0, max) ?? "";
}

export function pageParam(sp: Record<string, string | string[] | undefined>) {
  const n = Number(param(sp, "page", 6));
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : 1;
}

export function buildQuery(base: string, params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
