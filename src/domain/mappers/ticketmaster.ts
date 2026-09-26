import type { Artist, LineupEntry, MusicEvent, PriceRange, SourceRef, Venue } from "../types";
import {
  daysInclusive,
  estimateSize,
  mapTicketmasterStatus,
  normalizeCountry,
  normalizeCurrency,
  normalizeGenres,
  zonedToUtcIso,
} from "../normalize";
import { isValidLatLon } from "@/lib/geo";

/**
 * Ticketmaster Discovery v2 event -> MusicEvent.
 * Field names checked 2026-09-26 against
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(o) : []);
const s = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const n = (v: unknown): number | undefined => {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
};

function source(kind: string, id: string, url: string | undefined, fetchedAt: string): SourceRef[] {
  return [{ provider: "ticketmaster", externalId: `${kind}:${id}`, url: url ?? "https://www.ticketmaster.de", fetchedAt }];
}

function mapVenue(raw: Obj, fetchedAt: string): Venue {
  const loc = o(raw.location);
  const lat = n(loc.latitude);
  const lon = n(loc.longitude);
  const valid = isValidLatLon(lat, lon);
  return {
    id: `tm:${s(raw.id) ?? "unknown"}`,
    name: s(raw.name) ?? "",
    city: s(o(raw.city).name) ?? "",
    country: normalizeCountry(s(o(raw.country).countryCode)) ?? "",
    lat: valid ? lat : undefined,
    lon: valid ? lon : undefined,
    sources: source("venue", s(raw.id) ?? "", s(raw.url), fetchedAt),
  };
}

function mapPrice(raw: unknown): PriceRange | undefined {
  const ranges = arr(raw);
  const currency = normalizeCurrency(s(ranges[0]?.currency));
  if (!currency) return undefined;
  const same = ranges.filter((r) => normalizeCurrency(s(r.currency)) === currency);
  const mins = same.map((r) => n(r.min)).filter((x): x is number => x !== undefined && x > 0);
  const maxs = same.map((r) => n(r.max)).filter((x): x is number => x !== undefined && x > 0);
  if (!mins.length && !maxs.length) return undefined;
  return { min: mins.length ? Math.min(...mins) : undefined, max: maxs.length ? Math.max(...maxs) : undefined, currency };
}

function bestImage(raw: unknown): string | undefined {
  const imgs = arr(raw).filter((i) => s(i.url) && i.fallback !== true);
  const pick = imgs.filter((i) => i.ratio === "16_9").sort((a, b) => (n(b.width) ?? 0) - (n(a.width) ?? 0))[0] ?? imgs[0];
  return pick ? s(pick.url) : undefined;
}

function classificationNames(raw: unknown): (string | undefined)[] {
  return arr(raw).flatMap((c) => [s(o(c.genre).name), s(o(c.subGenre).name)]);
}

const FESTIVAL_RE = /\bfestival|fest\b|open air|openair/i;

export function mapTicketmasterEvent(raw: Obj, fetchedAt: string, now = new Date()): MusicEvent | null {
  const id = s(raw.id);
  const title = s(raw.name);
  const dates = o(raw.dates);
  const start = o(dates.start);
  const localDate = s(start.localDate);
  if (!id || !title || !localDate) return null;

  const venueRaw = arr(o(raw._embedded).venues)[0];
  const venue = venueRaw ? mapVenue(venueRaw, fetchedAt) : { id: "tm:unknown", name: "", city: "", country: "", sources: [] };
  const tz = s(dates.timezone) ?? s(venueRaw?.timezone) ?? "Europe/Berlin";

  const timeKnown = !!(s(start.dateTime) || s(start.localTime)) && start.timeTBA !== true && start.noSpecificTime !== true;
  const startsAt = s(start.dateTime) ?? zonedToUtcIso(localDate, s(start.localTime), tz);

  const end = o(dates.end);
  const endLocal = s(end.localDate);
  const endsAt = endLocal ? (s(end.dateTime) ?? zonedToUtcIso(endLocal, s(end.localTime) ?? "23:59:00", tz)) : undefined;
  const durationDays = endLocal ? daysInclusive(localDate, endLocal) : 1;

  const classes = arr(raw.classifications);
  const typeNames = classes.flatMap((c) => [s(o(c.type).name), s(o(c.subType).name)]).join(" ");
  const attractions = arr(o(raw._embedded).attractions);
  const isFestival = FESTIVAL_RE.test(title) || /festival/i.test(typeNames) || (durationDays > 1 && attractions.length > 3);

  const lineup: LineupEntry[] = attractions.map((a, i) => {
    const artist: Artist = {
      id: `tm:${s(a.id) ?? i}`,
      name: s(a.name) ?? "",
      genres: normalizeGenres(classificationNames(a.classifications)),
      imageUrl: bestImage(a.images),
      sources: source("attraction", s(a.id) ?? "", s(a.url), fetchedAt),
    };
    const role: LineupEntry["role"] = isFestival ? "lineup" : i === 0 ? "headliner" : "support";
    return { artist, role };
  });

  const sales = o(raw.sales);
  const nowMs = now.getTime();
  const publicStart = Date.parse(s(o(sales.public).startDateTime) ?? "");
  const presaleActive =
    (!Number.isFinite(publicStart) || publicStart > nowMs) &&
    arr(sales.presales).some((p) => Date.parse(s(p.startDateTime) ?? "") <= nowMs && nowMs <= Date.parse(s(p.endDateTime) ?? ""));

  const { size, estimated } = estimateSize({ isFestival, venueName: venue.name });

  return {
    id: `tm:${id}`,
    kind: isFestival ? "festival" : "concert",
    title,
    startsAt,
    startTimeKnown: timeKnown,
    endsAt,
    durationDays,
    venue,
    lineup,
    genres: normalizeGenres(classificationNames(raw.classifications)),
    price: mapPrice(raw.priceRanges),
    size,
    sizeEstimated: estimated,
    status: mapTicketmasterStatus(s(o(dates.status).code), presaleActive),
    officialTicketUrl: s(raw.url),
    imageUrl: bestImage(raw.images),
    announcedAt: Number.isFinite(publicStart) ? new Date(publicStart).toISOString() : undefined,
    sources: source("event", id, s(raw.url), fetchedAt),
  };
}
