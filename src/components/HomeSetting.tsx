"use client";

import { useId, useState } from "react";
import { GIESSEN, isValidLatLon, type LatLon } from "@/lib/geo";

export type Home = LatLon & { label: string };

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

/** Home coordinate: presets plus free lat/lon. Distances and "Nearby" follow it. */
export function HomeSetting({ home, onChange }: { home: Home; onChange: (h: Home) => void }) {
  const id = useId();
  const presetIndex = HOME_PRESETS.findIndex((p) => p.lat === home.lat && p.lon === home.lon);
  const [custom, setCustom] = useState({ lat: String(home.lat), lon: String(home.lon) });
  const [error, setError] = useState<string | null>(null);

  function applyCustom() {
    const lat = Number(custom.lat.replace(",", "."));
    const lon = Number(custom.lon.replace(",", "."));
    if (!isValidLatLon(lat, lon)) {
      setError("Breite zwischen -90 und 90, Länge zwischen -180 und 180.");
      return;
    }
    setError(null);
    onChange({ label: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, lat, lon });
  }

  return (
    <fieldset className="flex flex-wrap items-end gap-3">
      <legend className="mb-1 text-sm text-fg-muted">Heimatort für Entfernungen: {home.label}</legend>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fg-muted">Ort</span>
        <select
          value={presetIndex >= 0 ? String(presetIndex) : "custom"}
          onChange={(e) => {
            if (e.target.value !== "custom") onChange(HOME_PRESETS[Number(e.target.value)]);
          }}
          className="min-h-11 rounded border border-control bg-bg px-2 text-fg"
        >
          {HOME_PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
          <option value="custom">Eigene Koordinate</option>
        </select>
      </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-muted">Breite</span>
            <input
              inputMode="decimal"
              value={custom.lat}
              onChange={(e) => setCustom((c) => ({ ...c, lat: e.target.value }))}
              aria-describedby={error ? `${id}-err` : undefined}
              className="min-h-11 w-28 rounded border border-control bg-bg px-2 text-fg"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-muted">Länge</span>
            <input
              inputMode="decimal"
              value={custom.lon}
              onChange={(e) => setCustom((c) => ({ ...c, lon: e.target.value }))}
              aria-describedby={error ? `${id}-err` : undefined}
              className="min-h-11 w-28 rounded border border-control bg-bg px-2 text-fg"
            />
          </label>
          <button type="button" onClick={applyCustom} className="min-h-11 rounded border border-control px-3 text-sm font-medium hover:bg-fg/5">
            Koordinate übernehmen
          </button>
      {error && (
        <p id={`${id}-err`} role="alert" className="w-full text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}
