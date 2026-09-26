import "server-only";
import { DAY, cached } from "./cache";
import { throttledFetch } from "./http";
import type { LatLon } from "@/lib/geo";

/**
 * City-level geocoding via Nominatim, only for venues without coordinates.
 * Usage policy (checked 2026-09-26, https://operations.osmfoundation.org/policies/nominatim/):
 * max 1 req/s, identifying User-Agent, results must be cached, no bulk geocoding.
 * Attribution "© OpenStreetMap-Mitwirkende" is shown on /quellen.
 */
export function geocodeCity(city: string, country: string): Promise<LatLon | null> {
  return cached(`geo.${country}.${city.toLowerCase()}`, 90 * DAY, async () => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("city", city);
    url.searchParams.set("countrycodes", country.toLowerCase());
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    const res = await throttledFetch(url.toString(), 1100);
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const hits = (await res.json()) as { lat?: string; lon?: string }[];
    const lat = Number(hits[0]?.lat);
    const lon = Number(hits[0]?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  });
}
