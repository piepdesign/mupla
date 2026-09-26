/** Tolerant helpers for provider JSON. Last.fm returns numbers as strings and single items as objects. */

export function asArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

export function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
