"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Favorites, MusicEvent } from "@/domain/types";

/**
 * Favourites in localStorage, shaped like the Favorites type (version field for a later migration to a database).
 * One store for all components; changes propagate across tabs via the storage event.
 */

const KEY = "mupla-favorites";
export type FavoriteKind = "artists" | "genres" | "events" | "festivals";

/** Festivals and single events are stored apart, as the data model asks. */
export function eventFavoriteKind(e: Pick<MusicEvent, "kind">): FavoriteKind {
  return e.kind === "festival" ? "festivals" : "events";
}

export function emptyFavorites(): Favorites {
  return { version: 1, artists: [], genres: [], events: [], festivals: [], lastSeenAt: new Date(0).toISOString() };
}

/** Accepts only the known shape. Unknown versions are rejected instead of guessed. */
export function parseFavorites(raw: unknown): Favorites | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    version: 1,
    artists: strs(r.artists),
    genres: strs(r.genres),
    events: strs(r.events),
    festivals: strs(r.festivals),
    lastSeenAt: typeof r.lastSeenAt === "string" && !Number.isNaN(Date.parse(r.lastSeenAt)) ? r.lastSeenAt : new Date(0).toISOString(),
  };
}

let cache: Favorites | null = null;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = emptyFavorites();

function read(): Favorites {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (cache && raw === cacheRaw) return cache;
  cacheRaw = raw;
  let parsed: Favorites | null = null;
  try {
    parsed = raw ? parseFavorites(JSON.parse(raw)) : null;
  } catch {}
  cache = parsed ?? emptyFavorites();
  return cache;
}

export function writeFavorites(f: Favorites) {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {}
  cache = null;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites() {
  const favs = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
  const toggle = useCallback((kind: FavoriteKind, id: string) => {
    const cur = read();
    const list = cur[kind];
    writeFavorites({ ...cur, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  }, []);
  const has = useCallback((kind: FavoriteKind, id: string) => favs[kind].includes(id), [favs]);
  const eventIds = useMemo(() => new Set([...favs.events, ...favs.festivals]), [favs]);
  return { favs, toggle, has, eventIds };
}
