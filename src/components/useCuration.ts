"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { applySearch, applyView, type Candidate, type ViewResult } from "@/domain/curation";
import { applyFilters, applySort, parseFilters, serializeFilters, type Filters } from "@/domain/filters";
import type { ViewSlug } from "@/domain/views";
import { eventFavoriteKind, useFavorites } from "@/lib/favorites";
import { loadHome, saveHome, type Home } from "@/lib/home";
import type { MusicEvent, Recommendation } from "@/domain/types";
import { haversineKm } from "@/lib/geo";

export type CurationInput = {
  candidates: Candidate[];
  /** Events without any profile relation; only searched, never ranked. */
  unrelated?: MusicEvent[];
  now: string;
  defaultHome: Home;
  ledgerCreatedAt?: string;
};

const SCORE_KEY = "mupla-show-score";

/**
 * Shared client state for dashboard and detail pages: filters (mirrored into the URL), home location,
 * favourites and the "show calculation" switch. Scoring runs here, so every change is instant.
 */
export function useCuration({ candidates, unrelated = [], now, defaultHome, ledgerCreatedAt }: CurationInput) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => parseFilters(new URLSearchParams(searchParams.toString())));
  const [home, setHomeState] = useState<Home>(defaultHome);
  const [showScore, setShowScoreState] = useState(false);
  const { toggle, has, eventIds } = useFavorites();

  useEffect(() => {
    // localStorage is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHomeState(loadHome(defaultHome));
    try {
      setShowScoreState(localStorage.getItem(SCORE_KEY) === "1");
    } catch {}
  }, [defaultHome]);

  const updateFilters = useCallback(
    (f: Filters) => {
      setFilters(f);
      const qs = serializeFilters(f).toString();
      // Native history integrates with the Next router (docs: "Linking and navigating"), no server round trip.
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  const setHome = useCallback((h: Home) => {
    setHomeState(h);
    saveHome(h);
  }, []);

  const setShowScore = useCallback((v: boolean) => {
    setShowScoreState(v);
    try {
      localStorage.setItem(SCORE_KEY, v ? "1" : "0");
    } catch {}
  }, []);

  const run = useCallback(
    (view: ViewSlug): ViewResult => {
      const r = applyView(view, candidates, {
        home,
        discoveryLevel: filters.discovery / 100,
        priceMaxEur: filters.priceMax,
        now: new Date(now),
        ledgerCreatedAt,
        favoriteEventIds: eventIds,
        span: filters.span,
      });
      return { ...r, items: applySort(applyFilters(r.items, filters), filters.sort) };
    },
    [candidates, home, filters, now, ledgerCreatedAt, eventIds],
  );

  /**
   * Text search over everything: cards for events with a true reason, then "Off Profile" rows for the
   * rest (no relation at all, or a relation too weak to name). Null without a search term or genre filter.
   */
  const search = useMemo((): { items: Recommendation[]; offProfile: { event: MusicEvent; distanceKm?: number }[] } | null => {
    if (!filters.q.trim() && !filters.genres.length) return null;
    const items = applySort(
      applyFilters(
        applySearch(candidates, { home, discoveryLevel: filters.discovery / 100, priceMaxEur: filters.priceMax, now: new Date(now) }),
        filters,
      ),
      filters.sort,
    );
    const carded = new Set(items.map((r) => r.event.id));
    const rest = [...unrelated, ...candidates.map((c) => c.event)].filter((e) => !carded.has(e.id));
    const withDistance = rest.map((event) => ({
      event,
      distanceKm: event.venue.lat !== undefined && event.venue.lon !== undefined ? haversineKm(home, { lat: event.venue.lat, lon: event.venue.lon }) : undefined,
    }));
    const offProfile = applyFilters(withDistance, filters).sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
    return { items, offProfile };
  }, [candidates, unrelated, home, filters, now]);

  const favorites = useMemo(
    () => ({ isOn: (e: MusicEvent) => has(eventFavoriteKind(e), e.id), toggle: (e: MusicEvent) => toggle(eventFavoriteKind(e), e.id) }),
    [has, toggle],
  );

  /** Query string to carry filters into links (dashboard row -> detail and back). */
  const query = useMemo(() => {
    const qs = serializeFilters(filters).toString();
    return qs ? `?${qs}` : "";
  }, [filters]);

  return { filters, updateFilters, home, setHome, showScore, setShowScore, run, search, favorites, query };
}
