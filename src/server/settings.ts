import "server-only";
import { GIESSEN, isValidLatLon, type LatLon } from "@/lib/geo";

/** Server-side defaults. Home is Gießen unless HOME_LAT/HOME_LON are set; the UI can override per request. */
export const SWEEP_RADIUS_KM = 300;
export const HORIZON_MONTHS = 12;
export const PROFILE_ARTISTS_FOR_EVENT_SEARCH = 40;

export function homeFromEnv(): LatLon {
  const lat = Number(process.env.HOME_LAT);
  const lon = Number(process.env.HOME_LON);
  return isValidLatLon(lat, lon) ? { lat, lon } : GIESSEN;
}

export function defaultWindow(now = new Date()) {
  const to = new Date(now);
  to.setMonth(to.getMonth() + HORIZON_MONTHS);
  return { from: now, to };
}
