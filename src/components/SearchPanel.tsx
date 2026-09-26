"use client";

import { useId, useState } from "react";
import { COUNTRIES, DEFAULT_FILTERS, RADIUS_OPTIONS, SIZES, SORTS, WEEKDAYS, type Filters } from "@/domain/filters";
import type { Home } from "@/lib/home";
import { LocationField } from "./LocationField";
import { SelectField } from "./SelectField";
import { SearchIcon, SlidersIcon } from "./icons";

/** The header's search button focuses this input. */
export const SEARCH_INPUT_ID = "suche";

const control = "min-h-11 rounded border border-control bg-bg px-3 text-fg";
const group = "rounded border border-border";
const summary = "flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium";
const quiet = "min-h-11 rounded border border-control px-3 text-sm font-medium hover:bg-fg/5";

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

/** Filters beyond search, place, radius and sort. Counted so the closed panel still says something is set. */
function advancedCount(f: Filters): number {
  return (
    f.countries.length +
    f.sizes.length +
    f.weekdays.length +
    f.genres.length +
    Number(f.from !== undefined) +
    Number(f.to !== undefined) +
    Number(f.priceMin !== undefined) +
    Number(f.priceMax !== undefined) +
    Number(!f.showUnknownPrice) +
    Number(f.discovery !== DEFAULT_FILTERS.discovery)
  );
}

/**
 * The search area: the everyday controls in one row, everything else behind "Filter".
 * All controls are real form elements with labels; state lives in the URL (see useCuration).
 */
export function SearchPanel({
  filters: f,
  onChange,
  home,
  onHomeChange,
  showScore,
  onShowScoreChange,
  profileGenres,
  allGenres,
  resultCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  home: Home;
  onHomeChange: (h: Home) => void;
  showScore: boolean;
  onShowScoreChange: (v: boolean) => void;
  profileGenres: string[];
  allGenres: string[];
  resultCount: number;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [genreInput, setGenreInput] = useState("");
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const numberInput = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Number(v.replace(",", "."))) || undefined);
  const genreOptions = [...new Set([...profileGenres.slice(0, 16), ...f.genres])];
  const weekend = f.weekdays.length === 3 && [5, 6, 0].every((d) => f.weekdays.includes(d));
  const n = advancedCount(f);

  return (
    <form role="search" aria-label="Suche und Filter" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-[2] flex-col gap-1 text-sm">
          <span className="text-fg-muted">Search</span>
          <span className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              id={SEARCH_INPUT_ID}
              type="search"
              value={f.q}
              placeholder="Artist, Genre, Stadt, Event"
              onChange={(e) => set({ q: e.target.value })}
              className={`${control} w-full pl-9`}
            />
          </span>
        </label>
        <LocationField home={home} onChange={onHomeChange} />
        <SelectField label="Radius" value={f.radiusKm} onChange={(v) => set({ radiusKm: Number(v) })}>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r === 0 ? "egal" : `${r} km`}
            </option>
          ))}
        </SelectField>
        <SelectField label="Sort by" value={f.sort} onChange={(v) => set({ sort: v as Filters["sort"] })}>
          {SORTS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </SelectField>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-more`}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-2 ${quiet} ${open ? "bg-fg/5" : ""}`}
        >
          <SlidersIcon className="h-4 w-4" />
          Filter{n > 0 ? ` (${n})` : ""}
        </button>
      </div>

      <div id={`${id}-more`} hidden={!open} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-muted">From</span>
            <input type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} className={control} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-fg-muted">To</span>
            <input type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} className={control} />
          </label>
          <label className="flex min-w-56 flex-col gap-1 text-sm">
            <span className="text-fg-muted" id={`${id}-disc`}>
              Discovery: {f.discovery <= 10 ? "nur was ich höre" : f.discovery >= 90 ? "überrasch mich" : `${f.discovery} %`}
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
            <summary className={summary}>Countries{f.countries.length ? ` (${f.countries.length})` : ""}</summary>
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
            <summary className={summary}>Size{f.sizes.length ? ` (${f.sizes.length})` : ""}</summary>
            <fieldset className="px-3 pb-2">
              <legend className="sr-only">Größe</legend>
              {SIZES.map(([s, label]) => (
                <Check key={s} checked={f.sizes.includes(s)} onChange={() => set({ sizes: toggle(f.sizes, s) })}>
                  {label}
                </Check>
              ))}
              <p className="max-w-56 pb-1 text-xs text-fg-muted">Keine freie Quelle nennt Kapazitäten. Die Größe ist aus dem Venue-Namen geschätzt.</p>
            </fieldset>
          </details>

          <details className={group}>
            <summary className={summary}>Price{f.priceMin !== undefined || f.priceMax !== undefined || !f.showUnknownPrice ? " (gesetzt)" : ""}</summary>
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
                Teurere Termine verschwinden nicht, sie rutschen nach unten. Sonst fielen Festivals mit Frühbucherpreis raus.
              </p>
              <Check checked={f.showUnknownPrice} onChange={() => set({ showUnknownPrice: !f.showUnknownPrice })}>
                Termine ohne Preisangabe zeigen
              </Check>
            </fieldset>
          </details>

          <details className={group}>
            <summary className={summary}>Days{f.weekdays.length ? ` (${f.weekdays.length})` : ""}</summary>
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
            <summary className={summary}>Genre{f.genres.length ? ` (${f.genres.length})` : ""}</summary>
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
                  className={quiet}
                >
                  Hinzufügen
                </button>
              </div>
            </fieldset>
          </details>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={showScore} onChange={(e) => onShowScoreChange(e.target.checked)} className="h-5 w-5" />
            Rechenweg an jeder Karte zeigen
          </label>
          <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, span: f.span })} className={quiet}>
            Filter zurücksetzen
          </button>
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-fg-muted">
        {resultCount === 1 ? "1 Termin passt." : `${resultCount} Termine passen.`}
      </p>
    </form>
  );
}
