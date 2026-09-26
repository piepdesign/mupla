/**
 * Pure profile logic. No I/O, so it is unit-tested with fixtures.
 * The server orchestrator (src/server/profile.ts) feeds it Last.fm and MusicBrainz data.
 */

export type RankedArtist = { name: string; mbid?: string; plays: number; rank: number };

/** Recency weighting: recent listening counts more than all-time listening. Named constants, one place. */
export const PERIOD_WEIGHTS = { "1month": 0.45, "6month": 0.35, overall: 0.2 } as const;
export type WeightedPeriod = keyof typeof PERIOD_WEIGHTS;

/** Tags that describe listening behaviour, not music. Excluded from the genre profile. */
export const TAG_BLOCKLIST = new Set([
  "seen live", "favorites", "favourites", "favorite", "favourite", "love", "loved", "awesome",
  "my favorite", "all", "under 2000 listeners", "spotify", "albums i own", "beautiful",
]);

export const key = (name: string) => name.normalize("NFKC").toLowerCase().trim();

export function weightTopArtists(byPeriod: Partial<Record<WeightedPeriod, RankedArtist[]>>) {
  const acc = new Map<string, { name: string; mbid?: string; plays: number; weight: number }>();
  for (const period of Object.keys(PERIOD_WEIGHTS) as WeightedPeriod[]) {
    const list = byPeriod[period] ?? [];
    const max = Math.max(1, ...list.map((a) => a.plays));
    for (const a of list) {
      const k = key(a.name);
      const cur = acc.get(k) ?? { name: a.name, mbid: a.mbid, plays: 0, weight: 0 };
      cur.weight += PERIOD_WEIGHTS[period] * (a.plays / max);
      cur.mbid ??= a.mbid;
      // `plays` is the all-time count when available, used verbatim in reasons ("n-mal gehört").
      if (period === "overall") cur.plays = a.plays;
      else cur.plays = Math.max(cur.plays, a.plays);
      acc.set(k, cur);
    }
  }
  return [...acc.values()].sort((a, b) => b.weight - a.weight);
}

/**
 * Tag profile from the tags of the weighted top artists.
 * Last.fm's documented sample for artist.getTopTags has no `count`, so rank decides when it is missing.
 */
export function aggregateTags(
  artists: { name: string; weight: number }[],
  tagsByArtist: Map<string, { name: string; count?: number }[]>,
  perArtist = 5,
) {
  const acc = new Map<string, number>();
  for (const a of artists) {
    const tags = (tagsByArtist.get(key(a.name)) ?? []).filter((t) => t.name && !TAG_BLOCKLIST.has(t.name));
    tags.slice(0, perArtist).forEach((t, i) => {
      const strength = t.count !== undefined ? t.count / 100 : 1 - i / perArtist;
      acc.set(t.name, (acc.get(t.name) ?? 0) + a.weight * strength);
    });
  }
  const max = Math.max(1e-9, ...acc.values());
  return [...acc.entries()]
    .map(([tag, w]) => ({ tag, weight: w / max }))
    .sort((a, b) => b.weight - a.weight);
}

/** Similar artists not already in the profile. Keeps the strongest link and its origin ("via"). */
export function collectAdjacentArtists(
  sources: { via: string; similar: { name: string; mbid?: string; match: number }[] }[],
  known: Set<string>,
  minMatch = 0.2,
) {
  const acc = new Map<string, { name: string; mbid?: string; via: string; match: number }>();
  for (const s of sources) {
    for (const sim of s.similar) {
      const k = key(sim.name);
      if (known.has(k) || sim.match < minMatch) continue;
      const cur = acc.get(k);
      if (!cur || sim.match > cur.match) acc.set(k, { name: sim.name, mbid: sim.mbid, via: s.via, match: sim.match });
    }
  }
  return [...acc.values()].sort((a, b) => b.match - a.match);
}

/**
 * Adjacent genres: tags that are not in the profile.
 * Primary: tag.getSimilar (via = own tag). Fallback when it returns nothing:
 * tags of similar artists (via = own artist that led there).
 */
export function collectAdjacentTags(
  similarByTag: { via: string; similar: string[] }[],
  tagsOfAdjacentArtists: { via: string; tags: string[] }[],
  ownTags: Set<string>,
  limit = 30,
) {
  const out = new Map<string, { tag: string; via: string; method: "tag.getSimilar" | "similar-artists"; hits: number }>();
  for (const s of similarByTag) {
    for (const t of s.similar) {
      if (ownTags.has(t) || TAG_BLOCKLIST.has(t)) continue;
      const cur = out.get(t);
      if (cur) cur.hits++;
      else out.set(t, { tag: t, via: s.via, method: "tag.getSimilar", hits: 1 });
    }
  }
  if (out.size === 0) {
    for (const s of tagsOfAdjacentArtists) {
      for (const t of s.tags) {
        if (ownTags.has(t) || TAG_BLOCKLIST.has(t)) continue;
        const cur = out.get(t);
        if (cur) cur.hits++;
        else out.set(t, { tag: t, via: s.via, method: "similar-artists", hits: 1 });
      }
    }
  }
  return [...out.values()].sort((a, b) => b.hits - a.hits).slice(0, limit);
}

/**
 * Dormant artists: in the top 20 of a past year, and not in the top 20 of any later year
 * nor in the recent top list. The reason text claims exactly this, so it stays true.
 */
export function findDormant(
  yearCharts: { year: number; artists: RankedArtist[] }[],
  recent: RankedArtist[],
  topN = 20,
) {
  const recentKeys = new Set(recent.slice(0, 50).map((a) => key(a.name)));
  const years = [...yearCharts].sort((a, b) => a.year - b.year);
  const lastTopYear = new Map<string, { name: string; mbid?: string; year: number; plays: number }>();
  for (const y of years) {
    for (const a of y.artists.slice(0, topN)) {
      lastTopYear.set(key(a.name), { name: a.name, mbid: a.mbid, year: y.year, plays: a.plays });
    }
  }
  const latestYear = years.at(-1)?.year;
  return [...lastTopYear.entries()]
    .filter(([k, v]) => !recentKeys.has(k) && v.year !== latestYear)
    .map(([, v]) => v)
    .sort((a, b) => b.year - a.year || b.plays - a.plays);
}

/** Group Last.fm weekly chart ranges into calendar years (UTC). */
export function yearRanges(charts: { from: number; to: number }[], maxYears: number, now = new Date()) {
  const byYear = new Map<number, { from: number; to: number }>();
  for (const c of charts) {
    const y = new Date(c.from * 1000).getUTCFullYear();
    const cur = byYear.get(y);
    if (!cur) byYear.set(y, { ...c });
    else {
      cur.from = Math.min(cur.from, c.from);
      cur.to = Math.max(cur.to, c.to);
    }
  }
  const thisYear = now.getUTCFullYear();
  return [...byYear.entries()]
    .filter(([y]) => y < thisYear)
    .sort((a, b) => b[0] - a[0])
    .slice(0, maxYears)
    .map(([year, range]) => ({ year, ...range }));
}
