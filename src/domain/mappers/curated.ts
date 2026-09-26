import type { MusicEvent } from "../types";
import { daysInclusive, estimateSize, normalizeCountry, normalizeCurrency, normalizeGenres, zonedToUtcIso } from "../normalize";

/**
 * Hand-maintained events (data/curated-events.json), mainly festivals with day/stage line-ups
 * that no free API provides. Invalid entries are reported, not silently dropped.
 */

export type CuratedEntry = {
  id: string;
  title: string;
  kind?: MusicEvent["kind"];
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endDate?: string;
  venue: { name: string; city: string; country: string; lat?: number; lon?: number; capacity?: number };
  lineup?: { name: string; role?: "headliner" | "support" | "lineup"; day?: string; stage?: string }[];
  genres?: string[];
  price?: { min?: number; max?: number; currency: string; estimated?: boolean };
  ticketUrl?: string;
  merchUrl?: string;
  firstEditionYear?: number;
  sourceUrl?: string;
};

export function validateCurated(e: Partial<CuratedEntry>): string | null {
  if (!e.id || !e.title) return "id und title sind Pflicht";
  if (!e.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(e.startDate)) return `${e.id}: startDate muss YYYY-MM-DD sein`;
  if (e.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(e.endDate)) return `${e.id}: endDate muss YYYY-MM-DD sein`;
  if (!e.venue?.name || !e.venue.city || !normalizeCountry(e.venue.country)) return `${e.id}: venue braucht name, city und country (ISO, z. B. DE)`;
  if (e.price && !normalizeCurrency(e.price.currency)) return `${e.id}: price.currency muss ISO-4217 sein, z. B. EUR`;
  return null;
}

export function mapCurated(e: CuratedEntry, fetchedAt: string): MusicEvent {
  const src = [{ provider: "curated", externalId: e.id, url: e.sourceUrl ?? e.ticketUrl ?? "", fetchedAt }];
  const isFestival = (e.kind ?? (e.endDate && e.endDate !== e.startDate ? "festival" : "concert")) === "festival";
  const { size, estimated } = estimateSize({ isFestival, capacity: e.venue.capacity, venueName: e.venue.name });
  return {
    id: `curated:${e.id}`,
    kind: e.kind ?? (isFestival ? "festival" : "concert"),
    title: e.title,
    startsAt: zonedToUtcIso(e.startDate, e.startTime ? `${e.startTime}:00` : undefined),
    startTimeKnown: !!e.startTime,
    endsAt: e.endDate ? zonedToUtcIso(e.endDate, "23:59:00") : undefined,
    durationDays: e.endDate ? daysInclusive(e.startDate, e.endDate) : 1,
    venue: {
      id: `curated:venue:${e.venue.name}`,
      name: e.venue.name,
      city: e.venue.city,
      country: normalizeCountry(e.venue.country)!,
      lat: e.venue.lat,
      lon: e.venue.lon,
      capacity: e.venue.capacity,
      capacityEstimated: false,
      sources: src,
    },
    lineup: (e.lineup ?? []).map((l, i) => ({
      artist: { id: `curated:${e.id}:${i}`, name: l.name, genres: [], sources: src },
      role: l.role ?? (isFestival ? "lineup" : i === 0 ? "headliner" : "support"),
      day: l.day,
      stage: l.stage,
    })),
    genres: normalizeGenres(e.genres ?? []),
    price: e.price ? { ...e.price, currency: normalizeCurrency(e.price.currency)! } : undefined,
    size,
    sizeEstimated: estimated,
    status: "unknown",
    officialTicketUrl: e.ticketUrl,
    merchUrl: e.merchUrl,
    firstEditionYear: e.firstEditionYear,
    sources: src,
  };
}
