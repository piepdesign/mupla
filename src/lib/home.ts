import { GIESSEN, isValidLatLon, type LatLon } from "./geo";

export type Home = LatLon & { label: string };

/** Quick picks; any other place goes through the server geocoder (Nominatim). */
export const HOME_PRESETS: Home[] = [
  { label: "Gießen", ...GIESSEN },
  { label: "Marburg", lat: 50.8021, lon: 8.7667 },
  { label: "Frankfurt am Main", lat: 50.1109, lon: 8.6821 },
  { label: "Wetzlar", lat: 50.5558, lon: 8.5048 },
  { label: "Köln", lat: 50.9375, lon: 6.9603 },
  { label: "Berlin", lat: 52.52, lon: 13.405 },
];

const KEY = "mupla-home";

export function loadHome(fallback: Home): Home {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && isValidLatLon(raw.lat, raw.lon) && typeof raw.label === "string") return raw;
  } catch {}
  return fallback;
}

export function saveHome(h: Home) {
  try {
    localStorage.setItem(KEY, JSON.stringify(h));
  } catch {}
}
