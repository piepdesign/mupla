import "server-only";
import type { Artist, SourceRef, TasteProfile } from "@/domain/types";
import {
  aggregateTags,
  collectAdjacentArtists,
  collectAdjacentTags,
  findDormant,
  key,
  TAG_BLOCKLIST,
  weightTopArtists,
  yearRanges,
} from "@/domain/profile";
import { normalizeGenres } from "@/domain/normalize";
import { DAY, HOUR, cached } from "./cache";
import * as lastfm from "./providers/lastfm";
import * as mb from "./providers/musicbrainz";

/** How much of the profile to expand. Named constants so the API budget is visible in one place. */
export const PROFILE_LIMITS = {
  topArtistsPerPeriod: 100,
  artistsForTags: 30,
  artistsForSimilar: 15,
  similarPerArtist: 20,
  tagsForSimilar: 8,
  yearsBack: 6,
  mbResolve: 25,
} as const;

/** Cache TTLs. The finished profile is cached for 12 h, see README "Caching". */
export const PROFILE_TTL = 12 * HOUR;

export type ProfileDiagnostics = {
  builtIn: string;
  tagGetSimilarWorked: boolean;
  yearAggregationHonoured: boolean | null;
  mbResolved: number;
  mbAttempted: number;
  warnings: string[];
};

function lfSource(name: string, url?: string): SourceRef[] {
  return [
    {
      provider: "lastfm",
      externalId: name,
      url: url ?? `https://www.last.fm/music/${encodeURIComponent(name)}`,
      fetchedAt: new Date().toISOString(),
    },
  ];
}

/** Last.fm tags as artist genres: without personal tags like "seen live", normalised like event genres. */
function artistGenresFromTags(tags: { name: string }[]): string[] {
  return normalizeGenres(tags.map((t) => t.name).filter((n) => n && !TAG_BLOCKLIST.has(n))).slice(0, 5);
}

function toArtist(a: { name: string; mbid?: string; url?: string }, genres: string[] = []): Artist {
  return { id: a.mbid ? `mb:${a.mbid}` : `lf:${key(a.name)}`, name: a.name, mbid: a.mbid, genres, sources: lfSource(a.name, a.url) };
}

export function getTasteProfile(username: string, opts: { musicbrainz?: boolean } = {}) {
  const withMb = opts.musicbrainz ?? true;
  return cached(`profile.${key(username)}.${withMb ? "mb" : "nomb"}`, PROFILE_TTL, () => buildTasteProfile(username, withMb));
}

async function buildTasteProfile(username: string, withMb: boolean): Promise<{ profile: TasteProfile; diagnostics: ProfileDiagnostics }> {
  const started = Date.now();
  const warnings: string[] = [];
  const L = PROFILE_LIMITS;

  const [m1, m6, overall, y12] = await Promise.all([
    lastfm.getTopArtists(username, "1month", L.topArtistsPerPeriod),
    lastfm.getTopArtists(username, "6month", L.topArtistsPerPeriod),
    lastfm.getTopArtists(username, "overall", L.topArtistsPerPeriod),
    lastfm.getTopArtists(username, "12month", L.topArtistsPerPeriod),
  ]);
  const weighted = weightTopArtists({ "1month": m1, "6month": m6, overall });
  if (weighted.length === 0) warnings.push("Last.fm liefert keine Top-Artists. Stimmt der Nutzername, und ist das Profil öffentlich?");

  // Genre profile from the artists' tags.
  const tagSource = weighted.slice(0, L.artistsForTags);
  const tagLists = await Promise.all(tagSource.map((a) => lastfm.getArtistTopTags(a).catch(() => [])));
  const tagsByArtist = new Map(tagSource.map((a, i) => [key(a.name), tagLists[i]]));
  const topTags = aggregateTags(tagSource, tagsByArtist);
  const ownTagSet = new Set(topTags.slice(0, 25).map((t) => t.tag));

  // Neighbourhood.
  const known = new Set(weighted.map((a) => key(a.name)));
  const simSources = await Promise.all(
    weighted.slice(0, L.artistsForSimilar).map(async (a) => ({
      via: a.name,
      similar: await lastfm.getSimilarArtists(a, L.similarPerArtist).catch(() => []),
    })),
  );
  const adjacent = collectAdjacentArtists(simSources, known);

  const simTagSources = await Promise.all(
    topTags.slice(0, L.tagsForSimilar).map(async (t) => ({
      via: t.tag,
      similar: await lastfm.getSimilarTags(t.tag).catch(() => [] as string[]),
    })),
  );
  const tagGetSimilarWorked = simTagSources.some((s) => s.similar.length > 0);
  let adjacentArtistTags: { via: string; tags: string[] }[] = [];
  if (!tagGetSimilarWorked) {
    warnings.push("tag.getSimilar liefert nichts. Nachbar-Genres werden aus den Tags ähnlicher Artists abgeleitet.");
    const sample = adjacent.slice(0, 15);
    const lists = await Promise.all(sample.map((a) => lastfm.getArtistTopTags(a).catch(() => [])));
    adjacentArtistTags = sample.map((a, i) => ({ via: a.via, tags: lists[i].slice(0, 5).map((t) => t.name) }));
  }
  const adjacentTags = collectAdjacentTags(simTagSources, adjacentArtistTags, ownTagSet);

  // Dormant artists from yearly charts.
  let yearAggregationHonoured: boolean | null = null;
  let dormant: ReturnType<typeof findDormant> = [];
  try {
    const chartList = await lastfm.getWeeklyChartList(username);
    const years = yearRanges(chartList, L.yearsBack);
    const charts = await Promise.all(
      // Completed years never change, so they are cached for a year.
      years.map(async (y) => ({ year: y.year, ...(await lastfm.getArtistChart(username, y, 365 * DAY)) })),
    );
    yearAggregationHonoured = charts.length ? charts.every((c) => c.rangeHonoured) : null;
    if (yearAggregationHonoured === false) {
      warnings.push("Last.fm hat die Jahreszeiträume nicht wie angefragt zusammengefasst. „Wiedersehen“ ist deshalb unsicher.");
    }
    dormant = findDormant(charts, y12);
  } catch (e) {
    warnings.push(`Jahrescharts nicht abrufbar: ${(e as Error).message}`);
  }

  // MusicBrainz: resolve MBIDs and genres for the strongest artists (1 req/s, cached 30 days).
  const genresByKey = new Map<string, string[]>();
  let mbResolved = 0;
  let mbAttempted = 0;
  if (withMb) {
    for (const a of weighted.slice(0, L.mbResolve)) {
      mbAttempted++;
      try {
        const mbid = a.mbid ?? (await mb.findArtistMbid(a.name)) ?? undefined;
        if (!mbid) continue;
        a.mbid = mbid;
        const found = await mb.lookupArtist(mbid);
        if (found) {
          mbResolved++;
          genresByKey.set(key(a.name), found.genres);
        }
      } catch (e) {
        warnings.push(`MusicBrainz: ${a.name}: ${(e as Error).message}`);
        break; // stop early instead of hammering a failing service
      }
    }
  }

  const profile: TasteProfile = {
    username,
    builtAt: new Date().toISOString(),
    topArtists: weighted.map((a) => ({
      artist: toArtist(a, genresByKey.get(key(a.name)) ?? artistGenresFromTags(tagsByArtist.get(key(a.name)) ?? [])),
      plays: a.plays,
      weight: a.weight,
    })),
    topTags,
    adjacentArtists: adjacent.map((a) => ({ artist: toArtist(a), via: a.via, match: a.match })),
    adjacentTags: adjacentTags.map(({ tag, via, method }) => ({ tag, via, method })),
    dormantArtists: dormant.map((d) => ({ artist: toArtist(d), lastHeavyPeriod: String(d.year), plays: d.plays })),
  };

  return {
    profile,
    diagnostics: {
      builtIn: `${((Date.now() - started) / 1000).toFixed(1)} s`,
      tagGetSimilarWorked,
      yearAggregationHonoured,
      mbResolved,
      mbAttempted,
      warnings,
    },
  };
}
