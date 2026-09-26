import type { EventKind, EventStatus, MusicEvent, PriceRange, SourceRef, Venue } from "../types";
import { estimateSize, normalizeCountry, normalizeGenres } from "../normalize";
import { isValidLatLon } from "@/lib/geo";

/**
 * Eventfrog Public API v1 -> MusicEvent.
 * Field names from the API reference (OpenAPI 3.0.3, build of 2026-08-31), read from Fynn's
 * screenshots of https://docs.api.eventfrog.net/#publicapi-v1 on 2026-09-26:
 *   Event: id, title{lang}, url, begin, end, cancelled, soldOut, littleTicketsLeft, agendaEntryOnly,
 *          visible, published, rubricId, locationIds[], locationAlias{lang}, lowestTicketPrice, presaleLink
 *   Location: id, title{lang}, city, country (alpha-2), lat, lng, zip
 *   EventRubric: id, parentId (0 = none), title{lang}
 * Not used: emblemToShow. The docs forbid hotlinking image URLs; cards fall back to generated art.
 */

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const s = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const n = (v: unknown): number | undefined => {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
};

/** Multilingual text objects ({de, en, fr, …}): German first, then English, then whatever exists. */
export function localized(v: unknown): string | undefined {
  if (typeof v === "string") return s(v);
  const obj = o(v);
  return s(obj.de) ?? s(obj.en) ?? Object.values(obj).map(s).find(Boolean);
}

export type EfRubric = { id: number; parentId: number; title: string };

export function parseRubrics(body: unknown): EfRubric[] {
  const list = o(body).rubrics;
  if (!Array.isArray(list)) return [];
  return list.flatMap((r) => {
    const id = n(o(r).id);
    const title = localized(o(r).title);
    return id !== undefined && title ? [{ id, parentId: n(o(r).parentId) ?? 0, title }] : [];
  });
}

/** Rubric titles from the leaf up to the root, e.g. ["Rock / Pop", "Konzerte"]. */
export function rubricPath(id: number, rubrics: Map<number, EfRubric>): string[] {
  const out: string[] = [];
  let cur = rubrics.get(id);
  for (let guard = 0; cur && guard < 6; guard++) {
    out.push(cur.title);
    cur = cur.parentId ? rubrics.get(cur.parentId) : undefined;
  }
  return out;
}

/**
 * Which rubrics count as music. Eventfrog's rubric tree is not documented, so this matches titles
 * (German, English, French) and includes every descendant of a match. `(?!al)` keeps "Musical" out.
 * Checked against Fynn's live data on 2026-09-26: without the exclusions, musicals, shows,
 * children's events and courses made up about a fifth of the results.
 */
const MUSIC_RUBRIC_RE = /musi[kc](?!al)|musique|konzert|concert|festival|party|partys|parties|clubbing|nightlife|disco|\bdj\b/i;
const NON_MUSIC_RUBRIC_RE = /musical|show|variet|theater|theatre|kabarett|comedy|lesung|kinder|kids|kurs|seminar|workshop|führung|sport/i;

export function musicRubricIds(rubrics: EfRubric[]): number[] {
  const byId = new Map(rubrics.map((r) => [r.id, r]));
  return rubrics
    .filter((r) => {
      const path = rubricPath(r.id, byId);
      return path.some((t) => MUSIC_RUBRIC_RE.test(t)) && !path.some((t) => NON_MUSIC_RUBRIC_RE.test(t));
    })
    .map((r) => r.id);
}

const FESTIVAL_RE = /\bfestival|fest\b|open ?air/i;
const PARTY_RE = /party|partys|parties|clubbing|nightlife|disco/i;

function kindFor(title: string, path: string[]): EventKind {
  if (path.some((t) => /festival/i.test(t)) || FESTIVAL_RE.test(title)) return "festival";
  if (path.some((t) => PARTY_RE.test(t))) return "club-night";
  return "concert";
}

/** Generic rubric words that say nothing about genre. */
const GENERIC = /^(musik|music|musique|konzerte?|concerts?|festivals?|partys?|parties|party|clubbing|nightlife|diverse|andere|other|autres?|divers|(sonstige|weitere|andere)\b.*)$/i;

/**
 * Genre tags from the most specific rubric title only: "Rock / Pop" -> ["rock", "pop"].
 * Parent titles ("Konzerte", "Partys") are categories, not genres.
 */
export function genresFromRubrics(path: string[]): string[] {
  const leaf = path[0];
  if (!leaf) return [];
  const parts = leaf.split(/\s*[/&,+]\s*|\s+und\s+|\s+and\s+/i).map((p) => p.trim());
  return normalizeGenres(parts.filter((p) => p && !GENERIC.test(p)));
}

/**
 * Currency is not part of the Event model. Eventfrog sells in CHF in Switzerland/Liechtenstein
 * and in EUR elsewhere (inferred from the venue country, not documented). Other countries: no price.
 */
const EURO = new Set(["DE", "AT", "FR", "IT", "NL", "BE", "LU", "ES", "PT", "IE", "FI", "SK", "SI", "EE", "LV", "LT", "GR", "CY", "MT", "HR"]);
function currencyFor(country: string): string | undefined {
  if (country === "CH" || country === "LI") return "CHF";
  return EURO.has(country) ? "EUR" : undefined;
}

export type EfLocation = { id: string; name: string; city: string; country: string; lat?: number; lon?: number; url?: string };

export function parseLocations(body: unknown): EfLocation[] {
  const list = o(body).locations;
  if (!Array.isArray(list)) return [];
  return list.flatMap((raw) => {
    const l = o(raw);
    const id = s(l.id) ?? (n(l.id) !== undefined ? String(n(l.id)) : undefined);
    if (!id) return [];
    const lat = n(l.lat);
    const lon = n(l.lng);
    const valid = isValidLatLon(lat, lon);
    return [
      {
        id,
        name: localized(l.title) ?? "",
        city: s(l.city) ?? "",
        country: normalizeCountry(s(l.country)) ?? "",
        lat: valid ? lat : undefined,
        lon: valid ? lon : undefined,
        url: s(l.url),
      },
    ];
  });
}

function status(raw: Obj): EventStatus {
  if (raw.cancelled === true) return "cancelled";
  if (raw.soldOut === true) return "soldout";
  if (raw.agendaEntryOnly !== true && s(raw.presaleLink)) return "onsale";
  return "unknown";
}

export function mapEventfrogEvent(
  raw: Obj,
  locations: Map<string, EfLocation>,
  rubrics: Map<number, EfRubric>,
  fetchedAt: string,
): MusicEvent | null {
  const id = s(raw.id) ?? (n(raw.id) !== undefined ? String(n(raw.id)) : undefined);
  const title = localized(raw.title);
  const begin = s(raw.begin);
  if (!id || !title || !begin || !Number.isFinite(Date.parse(begin))) return null;
  if (raw.visible === false || raw.published === false) return null;

  const locIds = Array.isArray(raw.locationIds) ? raw.locationIds.map((x) => String(x)) : [];
  const loc = locIds.map((l) => locations.get(l)).find(Boolean);
  // Streaming/online events have no location; mupla is about going somewhere.
  if (!loc) return null;

  const url = s(raw.url) ?? "https://eventfrog.ch";
  const src = (kind: string, ext: string, u: string): SourceRef[] => [{ provider: "eventfrog", externalId: `${kind}:${ext}`, url: u, fetchedAt }];
  const venue: Venue = {
    id: `ef:${loc.id}`,
    name: localized(raw.locationAlias) ?? loc.name,
    city: loc.city,
    country: loc.country,
    lat: loc.lat,
    lon: loc.lon,
    sources: src("location", loc.id, loc.url ?? url),
  };

  const path = rubricPath(n(raw.rubricId) ?? -1, rubrics);
  const kind = kindFor(title, path);
  const genres = genresFromRubrics(path);

  const endIso = s(raw.end);
  const endsAt = endIso && Number.isFinite(Date.parse(endIso)) && Date.parse(endIso) > Date.parse(begin) ? new Date(endIso).toISOString() : undefined;
  // Calendar days in Berlin time. A night that ends before 08:00 does not count as another day,
  // otherwise every concert ending after midnight would read "2 Tage".
  const day = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso));
  const hour = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  const lastDay = endsAt ? Date.parse(`${day(endsAt)}T00:00:00Z`) - (hour(endsAt) < 8 ? 86_400_000 : 0) : 0;
  const durationDays = endsAt ? Math.round((lastDay - Date.parse(`${day(begin)}T00:00:00Z`)) / 86_400_000) + 1 : 1;

  const lowest = n(raw.lowestTicketPrice);
  const currency = currencyFor(venue.country);
  const price: PriceRange | undefined = lowest !== undefined && lowest > 0 && currency ? { min: lowest, currency } : undefined;

  const { size, estimated } = estimateSize({ isFestival: kind === "festival", venueName: venue.name });

  return {
    id: `ef:${id}`,
    kind,
    title,
    startsAt: new Date(begin).toISOString(),
    startTimeKnown: true,
    endsAt,
    durationDays: Math.max(1, durationDays),
    venue,
    // No structured line-up. For concerts the title usually names the act and stands in as headliner
    // (same rule as venue calendars); festivals and parties get none, so no artist reason is invented.
    lineup:
      kind === "concert"
        ? [{ artist: { id: `ef:${id}:headliner`, name: title, genres, sources: src("event", id, url) }, role: "headliner" }]
        : [],
    genres,
    price,
    size,
    sizeEstimated: estimated,
    status: status(raw),
    officialTicketUrl: s(raw.presaleLink) ?? url,
    sources: src("event", id, url),
  };
}
