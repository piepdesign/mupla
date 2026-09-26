"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { applyView, type Candidate } from "@/domain/curation";
import { applyFilters, parseFilters, serializeFilters, type Filters } from "@/domain/filters";
import type { MusicEvent } from "@/domain/types";
import { pairFor } from "@/design/tokens";
import { viewBySlug, type ViewSlug } from "@/domain/views";
import { haversineKm } from "@/lib/geo";
import { eventFavoriteKind, useFavorites } from "@/lib/favorites";
import { FilterBar } from "./FilterBar";
import { HomeSetting, loadHome, saveHome, type Home } from "./HomeSetting";
import { Shelf } from "./Shelf";
import { UnrelatedList } from "./UnrelatedList";

const PAGE = 30;

export type CuratorProps = {
  view: ViewSlug;
  candidates: Candidate[];
  now: string;
  defaultHome: Home;
  ledgerCreatedAt?: string;
  profileGenres: string[];
  /** Genres of all loaded events, for searching outside the profile. */
  allGenres: string[];
  /** Search page only: events without profile relation, listed separately and without ranking. */
  unrelated?: MusicEvent[];
  heading?: { label: string; question: string };
};

/** Client half of curation: scores the server's candidates for the current settings and filters, renders one shelf. */
export function Curator({ view, candidates, now, defaultHome, ledgerCreatedAt, profileGenres, allGenres, unrelated, heading }: CuratorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Local state so typing stays instant; the URL is updated alongside (shareable, survives reloads and view switches).
  const [filters, setFilters] = useState<Filters>(() => parseFilters(new URLSearchParams(searchParams.toString())));
  const [home, setHome] = useState<Home>(defaultHome);
  const [showScore, setShowScore] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const { toggle, has, eventIds } = useFavorites();
  const meta = heading ?? viewBySlug(view)!;

  useEffect(() => {
    // localStorage is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHome(loadHome(defaultHome));
  }, [defaultHome]);

  const updateFilters = (f: Filters) => {
    setFilters(f);
    setLimit(PAGE);
    const qs = serializeFilters(f).toString();
    // Native history integrates with the Next router (see next docs, "Linking and navigating"), no server round trip.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const result = useMemo(() => {
    const r = applyView(view, candidates, {
      home,
      discoveryLevel: filters.discovery / 100,
      priceMaxEur: filters.priceMax,
      now: new Date(now),
      ledgerCreatedAt,
      favoriteEventIds: eventIds,
    });
    return { ...r, items: applyFilters(r.items, filters) };
  }, [view, candidates, home, filters, now, ledgerCreatedAt, eventIds]);

  const unrelatedHits = useMemo(() => {
    if (!unrelated) return [];
    // Without a query the list would be the whole event pool; it is meant for finding, not browsing.
    if (!filters.q && !filters.genres.length) return [];
    const withDistance = unrelated.map((event) => ({
      event,
      distanceKm:
        event.venue.lat !== undefined && event.venue.lon !== undefined ? haversineKm(home, { lat: event.venue.lat, lon: event.venue.lon }) : undefined,
    }));
    return applyFilters(withDistance, filters).sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
  }, [unrelated, filters, home]);

  return (
    <>
      <section aria-label="Einstellungen" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
        <HomeSetting
          key={`${home.lat},${home.lon}`}
          home={home}
          onChange={(h) => {
            setHome(h);
            saveHome(h);
          }}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} className="h-5 w-5 accent-current" />
          Rechenweg an jeder Karte zeigen
        </label>
      </section>

      <FilterBar
        filters={filters}
        onChange={updateFilters}
        profileGenres={profileGenres}
        allGenres={allGenres}
        resultCount={result.items.length + unrelatedHits.length}
      />

      <Shelf
        id={view}
        title={meta.label}
        question={meta.question}
        pair={pairFor(view)}
        items={result.items}
        note={result.note}
        showScore={showScore}
        limit={limit}
        favorites={{ isOn: (e) => has(eventFavoriteKind(e), e.id), toggle: (e) => toggle(eventFavoriteKind(e), e.id) }}
        emptyText={
          view === "favoriten"
            ? "Noch nichts gemerkt, oder die Filter blenden deine Favoriten aus. Mit „Merken“ an einer Karte landet ein Termin hier."
            : "Für diese Ansicht und diese Filter gibt es keinen Termin mit einer belastbaren Begründung. Lieber leer als aufgefüllt."
        }
        footer={
          result.items.length > limit ? (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="min-h-11 self-start rounded border border-control px-4 text-sm font-medium hover:bg-fg/5"
            >
              {Math.min(PAGE, result.items.length - limit)} weitere zeigen ({result.items.length - limit} übrig)
            </button>
          ) : null
        }
      />

      {unrelated && <UnrelatedList items={unrelatedHits} active={Boolean(filters.q || filters.genres.length)} />}
    </>
  );
}

