export type LatLon = { lat: number; lon: number };

/** Gießen, Kreuzplatz. Default home; overridable via HOME_LAT/HOME_LON and later in the UI. */
export const GIESSEN: LatLon = { lat: 50.5841, lon: 8.6784 };

export function isValidLatLon(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0)
  );
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash encoding (Ticketmaster's `geoPoint` parameter expects one). */
export function geohash({ lat, lon }: LatLon, precision = 7): string {
  let latR = [-90, 90];
  let lonR = [-180, 180];
  let out = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (out.length < precision) {
    const r = even ? lonR : latR;
    const v = even ? lon : lat;
    const mid = (r[0] + r[1]) / 2;
    if (v >= mid) {
      ch = (ch << 1) | 1;
      if (even) lonR = [mid, r[1]];
      else latR = [mid, r[1]];
    } else {
      ch <<= 1;
      if (even) lonR = [r[0], mid];
      else latR = [r[0], mid];
    }
    even = !even;
    if (++bit === 5) {
      out += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return out;
}
