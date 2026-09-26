import type { MusicEvent, TasteProfile } from "./types";
import { normalizeName } from "./normalize";

export type Appearances = { ownTour: MusicEvent[]; guest: MusicEvent[]; festival: MusicEvent[] };

/**
 * Splits an artist's upcoming dates as the spec asks: own tour (headliner of a non-festival event),
 * guest appearance (support slot on someone else's event) and festival line-up.
 * Matching is by normalised name, the same rule the scoring uses.
 */
export function artistAppearances(events: MusicEvent[], name: string): Appearances {
  const k = normalizeName(name);
  const out: Appearances = { ownTour: [], guest: [], festival: [] };
  for (const e of events) {
    const entry = e.lineup.find((l) => normalizeName(l.artist.name) === k);
    if (!entry) continue;
    if (e.kind === "festival") out.festival.push(e);
    else if (entry.role === "support") out.guest.push(e);
    else out.ownTour.push(e);
  }
  const byDate = (a: MusicEvent, b: MusicEvent) => Date.parse(a.startsAt) - Date.parse(b.startsAt);
  out.ownTour.sort(byDate);
  out.guest.sort(byDate);
  out.festival.sort(byDate);
  return out;
}

export type ArtistHistory = {
  top?: { plays: number; rank: number };
  dormant?: { period: string; plays: number };
  similarTo?: { via: string; match: number }[];
  genres: string[];
};

/** What the listening profile knows about one artist. Only facts from the profile, nothing inferred. */
export function artistHistory(profile: TasteProfile, name: string): ArtistHistory {
  const k = normalizeName(name);
  const topIdx = profile.topArtists.findIndex((a) => normalizeName(a.artist.name) === k);
  const top = topIdx >= 0 ? profile.topArtists[topIdx] : undefined;
  const dormant = profile.dormantArtists.find((a) => normalizeName(a.artist.name) === k);
  const similar = profile.adjacentArtists.filter((a) => normalizeName(a.artist.name) === k);
  return {
    top: top ? { plays: top.plays, rank: topIdx + 1 } : undefined,
    dormant: dormant ? { period: dormant.lastHeavyPeriod, plays: dormant.plays } : undefined,
    similarTo: similar.length ? similar.map((s) => ({ via: s.via, match: s.match })) : undefined,
    genres: top?.artist.genres ?? dormant?.artist.genres ?? similar[0]?.artist.genres ?? [],
  };
}
