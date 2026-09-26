import type { EventSize, MusicEvent, Recommendation } from "./types";
import { categoryGenres } from "./normalize";
import { SPANS, type Span } from "./views";

/**
 * Filters are orthogonal to views, live in the URL (shareable, survive reloads and view switches)
 * and work combined. Pure parse/serialise/apply so they are testable.
 */

export const COUNTRIES = [
  ["DE", "Deutschland"], ["AT", "Österreich"], ["CH", "Schweiz"], ["NL", "Niederlande"], ["BE", "Belgien"],
  ["LU", "Luxemburg"], ["FR", "Frankreich"], ["DK", "Dänemark"], ["PL", "Polen"], ["CZ", "Tschechien"],
] as const;

export const SIZES: [EventSize, string][] = [
  ["club", "Club"], ["hall", "Hall"], ["arena", "Arena"], ["open-air", "Open Air"], ["festival", "Festival"], ["unknown", "Unknown"],
];

export const WEEKDAYS = [["1", "Mo"], ["2", "Di"], ["3", "Mi"], ["4", "Do"], ["5", "Fr"], ["6", "Sa"], ["0", "So"]] as const;

export const RADIUS_OPTIONS = [25, 50, 100, 150, 250, 400, 0] as const; // 0 = egal

export const SORTS = [
  ["standard", "Best match"],
  ["date", "Date"],
  ["distance", "Distance"],
  ["price", "Price"],
] as const;
export type Sort = (typeof SORTS)[number][0];

export type Filters = {
  countries: string[]; // empty = all
  radiusKm: number; // 0 = no limit
  priceMin?: number;
  priceMax?: number; // soft: feeds price friction, not a hard cut
  showUnknownPrice: boolean;
  sizes: EventSize[]; // empty = all
  from?: string; // YYYY-MM-DD
  to?: string;
  weekdays: number[]; // 0 = Sunday; empty = all
  genres: string[]; // empty = all
  discovery: number; // 0..100
  q: string;
  /** "standard" keeps each view's own order (score, date, distance ...). */
  sort: Sort;
  /** Timeframe view: week, month or year. */
  span: Span;
};

export const DEFAULT_FILTERS: Filters = {
  countries: [],
  radiusKm: 150,
  showUnknownPrice: true,
  sizes: [],
  weekdays: [],
  genres: [],
  discovery: 30,
  q: "",
  sort: "standard",
  span: "week",
};

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const numOrUndef = (v: string | null) => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const dateOrUndef = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export function parseFilters(sp: URLSearchParams): Filters {
  const radius = numOrUndef(sp.get("km"));
  const disc = numOrUndef(sp.get("entdeckung"));
  const validSizes = new Set(SIZES.map(([s]) => s));
  return {
    countries: list(sp.get("land")).map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)),
    radiusKm: radius ?? DEFAULT_FILTERS.radiusKm,
    priceMin: numOrUndef(sp.get("preis_min")),
    priceMax: numOrUndef(sp.get("preis_max")),
    showUnknownPrice: sp.get("preis_unbekannt") !== "0",
    sizes: list(sp.get("groesse")).filter((s): s is EventSize => validSizes.has(s as EventSize)),
    from: dateOrUndef(sp.get("von")),
    to: dateOrUndef(sp.get("bis")),
    weekdays: list(sp.get("tage")).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    genres: list(sp.get("genre")).map((g) => g.toLowerCase()),
    discovery: disc === undefined ? DEFAULT_FILTERS.discovery : Math.min(100, disc),
    q: sp.get("q")?.trim() ?? "",
    sort: SORTS.find(([k]) => k === sp.get("sort"))?.[0] ?? "standard",
    span: SPANS.find((x) => x.key === sp.get("span"))?.key ?? "week",
  };
}

/** Only non-default values go into the URL, so links stay short. */
export function serializeFilters(f: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.countries.length) sp.set("land", f.countries.join(","));
  if (f.radiusKm !== DEFAULT_FILTERS.radiusKm) sp.set("km", String(f.radiusKm));
  if (f.priceMin !== undefined) sp.set("preis_min", String(f.priceMin));
  if (f.priceMax !== undefined) sp.set("preis_max", String(f.priceMax));
  if (!f.showUnknownPrice) sp.set("preis_unbekannt", "0");
  if (f.sizes.length) sp.set("groesse", f.sizes.join(","));
  if (f.from) sp.set("von", f.from);
  if (f.to) sp.set("bis", f.to);
  if (f.weekdays.length) sp.set("tage", f.weekdays.join(","));
  if (f.genres.length) sp.set("genre", f.genres.join(","));
  if (f.discovery !== DEFAULT_FILTERS.discovery) sp.set("entdeckung", String(f.discovery));
  if (f.q) sp.set("q", f.q);
  if (f.sort !== DEFAULT_FILTERS.sort) sp.set("sort", f.sort);
  if (f.span !== DEFAULT_FILTERS.span) sp.set("span", f.span);
  return sp;
}

const berlinParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localDateAndWeekday(iso: string): { date: string; weekday: number } {
  const parts = berlinParts.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: WD[get("weekday")] ?? -1 };
}

/**
 * Every genre word attached to an event, including both halves of an umbrella category.
 * Right for finding ("show me house"), wrong for reasons, which use scoring's stricter view.
 */
export function eventGenreWords(e: MusicEvent): string[] {
  return [
    ...e.genres,
    ...categoryGenres(e.category),
    ...e.lineup.flatMap((l) => [...l.artist.genres, ...categoryGenres(l.artist.category), ...(l.artist.tags ?? [])]),
  ];
}

/** Text match over artist names, title, venue, city and genres. Accent- and case-insensitive. */
export function matchesQuery(r: Pick<Recommendation, "event">, q: string): boolean {
  if (!q) return true;
  const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  const needle = norm(q);
  const e = r.event;
  const hay = [e.title, e.venue.name, e.venue.city, ...eventGenreWords(e), ...e.lineup.map((l) => l.artist.name)];
  return hay.some((h) => norm(h).includes(needle));
}

export function applyFilters<T extends Pick<Recommendation, "event" | "distanceKm">>(items: T[], f: Filters): T[] {
  return items.filter((r) => {
    const e = r.event;
    if (f.countries.length && !f.countries.includes(e.venue.country)) return false;
    if (f.radiusKm > 0 && (r.distanceKm === undefined || r.distanceKm > f.radiusKm)) return false;
    const knownPrice = e.price && (e.price.min !== undefined || e.price.max !== undefined);
    if (!knownPrice && !f.showUnknownPrice) return false;
    if (knownPrice && f.priceMin !== undefined && (e.price!.max ?? e.price!.min!) < f.priceMin) return false;
    if (f.sizes.length && !f.sizes.includes(e.size)) return false;
    const { date, weekday } = localDateAndWeekday(e.startsAt);
    const endDate = e.endsAt ? localDateAndWeekday(e.endsAt).date : date;
    if (f.from && endDate < f.from) return false;
    if (f.to && date > f.to) return false;
    if (f.weekdays.length && !f.weekdays.includes(weekday)) return false;
    if (f.genres.length) {
      const g = new Set(eventGenreWords(e));
      if (!f.genres.some((x) => g.has(x))) return false;
    }
    return matchesQuery(r, f.q);
  });
}

/** Re-sorts a view's result. Unknown distance or price always goes last, never first. */
export function applySort<T extends Pick<Recommendation, "event" | "distanceKm">>(items: T[], sort: Sort): T[] {
  if (sort === "standard") return items;
  const last = (v: number | undefined) => (v === undefined ? Infinity : v);
  const key: Record<Exclude<Sort, "standard">, (r: T) => number> = {
    date: (r) => Date.parse(r.event.startsAt),
    distance: (r) => last(r.distanceKm),
    price: (r) => last(r.event.price?.min ?? r.event.price?.max),
  };
  return [...items].sort((a, b) => key[sort](a) - key[sort](b));
}
