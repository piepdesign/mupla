"use client";

import { useId, useState } from "react";
import { COUNTRIES, DEFAULT_FILTERS, RADIUS_OPTIONS, SIZES, WEEKDAYS, type Filters } from "@/domain/filters";

const control = "min-h-11 rounded border border-control bg-bg px-2 text-fg";
const group = "rounded border border-border";
const summary = "flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 items-center gap-2 pr-3 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-5 w-5 shrink-0" />
      {children}
    </label>
  );
}

/**
 * All filters are real form controls with labels. State lives in the URL (see Curator),
 * so a filter set can be shared, reloaded and survives switching views.
 */
export function FilterBar({
  filters: f,
  onChange,
  profileGenres,
  allGenres,
  resultCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  profileGenres: string[];
  allGenres: string[];
  resultCount: number;
}) {
  const id = useId();
  const [genreInput, setGenreInput] = useState("");
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const numberInput = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Number(v.replace(",", "."))) || undefined);
  const genreOptions = [...new Set([...profileGenres.slice(0, 16), ...f.genres])];
  const weekend = f.weekdays.length === 3 && [5, 6, 0].every((d) => f.weekdays.includes(d));

  return (
    <form role="search" aria-label="Filter und Suche" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm">
          <span className="text-fg-muted">Suche nach Artist, Genre, Ort oder Event</span>
          <input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} className={control} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">Umkreis</span>
          <select value={f.radiusKm} onChange={(e) => set({ radiusKm: Number(e.target.value) })} className={control}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r === 0 ? "egal" : `${r} km`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">von</span>
          <input type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} className={control} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fg-muted">bis</span>
          <input type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} className={control} />
        </label>
        <label className="flex min-w-56 flex-col gap-1 text-sm">
          <span className="text-fg-muted" id={`${id}-disc`}>
            Entdeckungsgrad: {f.discovery <= 10 ? "nur was ich höre" : f.discovery >= 90 ? "überrasch mich" : `${f.discovery} %`}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={f.discovery}
            aria-labelledby={`${id}-disc`}
            aria-valuetext={`${f.discovery} Prozent`}
            onChange={(e) => set({ discovery: Number(e.target.value) })}
            className="min-h-11 accent-current"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <details className={group}>
          <summary className={summary}>Länder{f.countries.length ? ` (${f.countries.length})` : ": alle"}</summary>
          <fieldset className="grid grid-cols-2 px-3 pb-2">
            <legend className="sr-only">Länder</legend>
            {COUNTRIES.map(([code, label]) => (
              <Check key={code} checked={f.countries.includes(code)} onChange={() => set({ countries: toggle(f.countries, code) })}>
                {label}
              </Check>
            ))}
          </fieldset>
        </details>

        <details className={group}>
          <summary className={summary}>Größe{f.sizes.length ? ` (${f.sizes.length})` : ": alle"}</summary>
          <fieldset className="px-3 pb-2">
            <legend className="sr-only">Größe</legend>
            {SIZES.map(([s, label]) => (
              <Check key={s} checked={f.sizes.includes(s)} onChange={() => set({ sizes: toggle(f.sizes, s) })}>
                {label}
              </Check>
            ))}
            <p className="max-w-56 pb-1 text-xs text-fg-muted">Ohne Kapazitätsangabe ist die Größe aus dem Venue-Namen geschätzt.</p>
          </fieldset>
        </details>

        <details className={group}>
          <summary className={summary}>Preis{f.priceMin !== undefined || f.priceMax !== undefined || !f.showUnknownPrice ? " (gesetzt)" : ""}</summary>
          <fieldset className="flex flex-col gap-2 px-3 pb-3">
            <legend className="sr-only">Preis</legend>
            <div className="flex gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-muted">ab € (hart)</span>
                <input type="number" min={0} inputMode="numeric" value={f.priceMin ?? ""} onChange={(e) => set({ priceMin: numberInput(e.target.value) })} className={`${control} w-24`} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-muted">bis € (weich)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={f.priceMax ?? ""}
                  onChange={(e) => set({ priceMax: numberInput(e.target.value) })}
                  aria-describedby={`${id}-soft`}
                  className={`${control} w-24`}
                />
              </label>
            </div>
            <p id={`${id}-soft`} className="max-w-64 text-xs text-fg-muted">
              Teurere Termine verschwinden nicht, sie rutschen im Score nach unten. Sonst fielen Festivals mit Frühbucherpreis raus.
            </p>
            <Check checked={f.showUnknownPrice} onChange={() => set({ showUnknownPrice: !f.showUnknownPrice })}>
              Termine mit unbekanntem Preis zeigen
            </Check>
          </fieldset>
        </details>

        <details className={group}>
          <summary className={summary}>Wochentage{f.weekdays.length ? ` (${f.weekdays.length})` : ": alle"}</summary>
          <fieldset className="px-3 pb-2">
            <legend className="sr-only">Wochentage</legend>
            <div className="grid grid-cols-4">
              {WEEKDAYS.map(([d, label]) => (
                <Check key={d} checked={f.weekdays.includes(Number(d))} onChange={() => set({ weekdays: toggle(f.weekdays, Number(d)) })}>
                  {label}
                </Check>
              ))}
            </div>
            <Check checked={weekend} onChange={() => set({ weekdays: weekend ? [] : [5, 6, 0] })}>
              Nur Wochenende (Fr bis So)
            </Check>
          </fieldset>
        </details>

        <details className={group}>
          <summary className={summary}>Genre{f.genres.length ? ` (${f.genres.length})` : ": alle"}</summary>
          <fieldset className="flex flex-col px-3 pb-3">
            <legend className="sr-only">Genre</legend>
            <div className="grid grid-cols-2">
              {genreOptions.map((g) => (
                <Check key={g} checked={f.genres.includes(g)} onChange={() => set({ genres: toggle(f.genres, g) })}>
                  {g}
                </Check>
              ))}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-muted">Weiteres Genre, auch außerhalb deines Profils</span>
                <input list={`${id}-genres`} value={genreInput} onChange={(e) => setGenreInput(e.target.value)} className={control} />
                <datalist id={`${id}-genres`}>
                  {allGenres.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>
              <button
                type="button"
                onClick={() => {
                  const g = genreInput.trim().toLowerCase();
                  if (g && !f.genres.includes(g)) set({ genres: [...f.genres, g] });
                  setGenreInput("");
                }}
                className="min-h-11 rounded border border-control px-3 text-sm font-medium hover:bg-fg/5"
              >
                Hinzufügen
              </button>
            </div>
          </fieldset>
        </details>

        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FILTERS })}
          className="min-h-11 rounded border border-control px-3 text-sm font-medium hover:bg-fg/5"
        >
          Filter zurücksetzen
        </button>
      </div>

      <p aria-live="polite" className="text-sm text-fg-muted">
        {resultCount === 1 ? "1 Termin passt." : `${resultCount} Termine passen.`}
      </p>
    </form>
  );
}
