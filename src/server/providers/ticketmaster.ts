import "server-only";
import { mapTicketmasterEvent } from "@/domain/mappers/ticketmaster";
import type { MusicEvent } from "@/domain/types";
import { geohash } from "@/lib/geo";
import { HOUR, cached } from "../cache";
import { HttpError, throttledFetch } from "../http";
import type { EventProvider, EventQuery, ProviderResult } from "./types";

/**
 * Ticketmaster Discovery API v2. Docs checked 2026-09-26:
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * Quota 5000 calls/day, 5 req/s; deep paging only up to item 1000 (size * page < 1000).
 * Terms: event content may only be cached "for reasonable periods" -> 6 h.
 */

const ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const GAP_MS = 220; // stays under 5 req/s
const PAGE_SIZE = 100; // documented default is 20; no documented maximum, 100 keeps size*page < 1000 at 10 pages
const MAX_PAGES = 10;
const TTL = 6 * HOUR;

/**
 * Countries kept from the artist sweep. Filtered locally on the venue's country, because
 * multi-value `countryCode` is not documented.
 */
export const ARTIST_SWEEP_COUNTRIES = new Set(["DE", "AT", "CH", "NL", "BE", "LU", "DK", "PL", "CZ", "FR"]);

function key(): string | undefined {
  return process.env.TICKETMASTER_API_KEY?.trim() || undefined;
}

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

async function page(params: Record<string, string>): Promise<{ events: Record<string, unknown>[]; totalPages: number; total: number }> {
  const url = new URL(ROOT);
  url.searchParams.set("apikey", key()!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await throttledFetch(url.toString(), GAP_MS);
  if (res.status === 429) throw new HttpError(429, "ticketmaster", "Ticketmaster: Kontingent oder Ratelimit erreicht (429)");
  if (res.status === 401) throw new HttpError(401, "ticketmaster", "Ticketmaster: API-Key ungültig (401)");
  if (!res.ok) throw new HttpError(res.status, "ticketmaster", `Ticketmaster HTTP ${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;
  const emb = (body._embedded ?? {}) as Record<string, unknown>;
  const pg = (body.page ?? {}) as Record<string, number>;
  return { events: (emb.events as Record<string, unknown>[]) ?? [], totalPages: pg.totalPages ?? 0, total: pg.totalElements ?? 0 };
}

async function sweep(label: string, params: Record<string, string>): Promise<{ raw: Record<string, unknown>[]; total: number }> {
  return cached(`tm.${label}`, TTL, async () => {
    const raw: Record<string, unknown>[] = [];
    let total = 0;
    for (let p = 0; p < MAX_PAGES; p++) {
      const r = await page({ ...params, size: String(PAGE_SIZE), page: String(p), sort: "date,asc" });
      raw.push(...r.events);
      total = r.total;
      if (p + 1 >= r.totalPages) break;
    }
    return { raw, total };
  });
}

export const ticketmaster: EventProvider = {
  id: "ticketmaster",
  label: "Ticketmaster",
  isConfigured: () => !!key(),

  async fetchEvents(q: EventQuery): Promise<ProviderResult> {
    const warnings: string[] = [];
    const window = { classificationName: "music", startDateTime: iso(q.from), endDateTime: iso(q.to) };
    const fetchedAt = new Date().toISOString();

    // 1) Everything musical around home.
    const geoParams = { ...window, geoPoint: geohash(q.center, 7), radius: String(Math.round(q.radiusKm)), unit: "km" };
    let geo = await sweep(`geo.${geoParams.geoPoint}.${geoParams.radius}.${q.from.toISOString().slice(0, 10)}.${q.to.toISOString().slice(0, 10)}`, geoParams);
    if (geo.raw.length === 0) {
      // `latlong` is deprecated in favour of geoPoint but was verified to work on 2026-09-26.
      const ll = { ...window, latlong: `${q.center.lat},${q.center.lon}`, radius: geoParams.radius, unit: "km" };
      geo = await sweep(`latlong.${ll.latlong}.${ll.radius}.${q.from.toISOString().slice(0, 10)}`, ll);
    }
    if (geo.total > MAX_PAGES * PAGE_SIZE) {
      warnings.push(`Ticketmaster meldet ${geo.total} Termine im Umkreis, abrufbar sind höchstens ${MAX_PAGES * PAGE_SIZE}. Die spätesten fehlen.`);
    }

    // 2) Profile artists anywhere in the listed European markets (Grenzgänger, artist pages).
    const artistRaw: Record<string, unknown>[] = [];
    for (const name of q.artists) {
      try {
        const r = await sweep(`artist.${name.toLowerCase()}.${q.from.toISOString().slice(0, 10)}`, {
          ...window,
          keyword: name,
        });
        artistRaw.push(...r.raw);
      } catch (e) {
        warnings.push(`Artist-Suche „${name}“: ${(e as Error).message}`);
        if (e instanceof HttpError && (e.status === 429 || e.status === 401)) break;
      }
    }

    const seen = new Set<string>();
    const events: MusicEvent[] = [];
    const geoIds = new Set(geo.raw.map((r) => `tm:${String(r.id)}`));
    for (const raw of [...geo.raw, ...artistRaw]) {
      const e = mapTicketmasterEvent(raw, fetchedAt);
      if (!e || seen.has(e.id)) continue;
      if (!geoIds.has(e.id) && !ARTIST_SWEEP_COUNTRIES.has(e.venue.country)) continue;
      seen.add(e.id);
      events.push(e);
    }
    return { events, warnings };
  },
};
