"use client";

import { useId, useState } from "react";
import { HOME_PRESETS, type Home } from "@/lib/home";
import { PinIcon } from "./icons";

/**
 * Home location for distances. Set once, so it sits quietly in the search panel:
 * a button with the place name, which turns into a place search on demand.
 */
export function LocationField({ home, onChange }: { home: Home; onChange: (h: Home) => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const q = value.trim();
    if (!q) return;
    const preset = HOME_PRESETS.find((p) => p.label.toLowerCase() === q.toLowerCase());
    if (preset) return done(preset);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok) setError(body.error ?? "Ort nicht gefunden.");
      else done(body as Home);
    } catch {
      setError("Ortssuche gerade nicht erreichbar.");
    } finally {
      setBusy(false);
    }
  }

  function done(h: Home) {
    onChange(h);
    setEditing(false);
    setValue("");
    setError(null);
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-fg-muted" id={`${id}-l`}>
          Location
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-labelledby={`${id}-l ${id}-v`}
          className="inline-flex min-h-11 items-center gap-2 rounded border border-control px-3 text-fg hover:bg-fg/5"
        >
          <PinIcon className="h-4 w-4" />
          <span id={`${id}-v`}>{home.label}</span>
          <span className="sr-only">, ändern</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={`${id}-i`} className="text-fg-muted">
        Location
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-i`}
          list={`${id}-p`}
          value={value}
          autoFocus
          placeholder={home.label}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
            if (e.key === "Escape") setEditing(false);
          }}
          aria-describedby={error ? `${id}-e` : undefined}
          className="min-h-11 w-44 rounded border border-control bg-bg px-3 text-fg"
        />
        <datalist id={`${id}-p`}>
          {HOME_PRESETS.map((p) => (
            <option key={p.label} value={p.label} />
          ))}
        </datalist>
        <button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11 rounded bg-fg px-3 font-semibold text-bg hover:opacity-90">
          {busy ? "Suche …" : "OK"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded border border-control px-3 hover:bg-fg/5">
          Abbrechen
        </button>
      </div>
      {error && (
        <p id={`${id}-e`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
