import "server-only";
import { DAY, HOUR, cached } from "../cache";
import { HttpError, throttledFetch } from "../http";
import { asArray, num, str } from "./parse";

/**
 * Last.fm API client (read-only, API key only).
 * Docs checked 2026-09-26: https://www.last.fm/api  (methods linked per function).
 * Last.fm documents no fixed rate limit; error 29 means "Rate Limit Exceeded".
 * We keep a conservative 250 ms gap (own choice, not a documented number).
 */

const ROOT = "https://ws.audioscrobbler.com/2.0/";
const GAP_MS = 250;

export type LastfmPeriod = "overall" | "7day" | "1month" | "3month" | "6month" | "12month";

export class LastfmError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(`Last.fm error ${code}: ${message}`);
  }
}

function apiKey(): string {
  const key = process.env.LASTFM_API_KEY?.trim();
  if (!key) throw new LastfmError(10, "LASTFM_API_KEY fehlt in .env.local");
  return key;
}

async function call(method: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
  const url = new URL(ROOT);
  url.searchParams.set("method", method);
  url.searchParams.set("format", "json");
  url.searchParams.set("api_key", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await throttledFetch(url.toString(), GAP_MS);
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (body && typeof body.error === "number") throw new LastfmError(body.error, String(body.message ?? ""));
  if (!res.ok || !body) throw new HttpError(res.status, method, `Last.fm ${method} failed with HTTP ${res.status}`);
  return body;
}

export type LfArtist = { name: string; mbid?: string; url?: string; plays: number; rank: number };

/** https://www.last.fm/api/show/user.getTopArtists */
export function getTopArtists(user: string, period: LastfmPeriod, limit = 100): Promise<LfArtist[]> {
  return cached(`lastfm.topartists.${user}.${period}.${limit}`, 12 * HOUR, async () => {
    const body = await call("user.getTopArtists", { user, period, limit });
    const root = body.topartists as Record<string, unknown> | undefined;
    return asArray(root?.artist).map((a, i) => ({
      name: str(a.name) ?? "",
      mbid: str(a.mbid) || undefined,
      url: str(a.url),
      plays: num(a.playcount) ?? 0,
      rank: num((a["@attr"] as Record<string, unknown> | undefined)?.rank) ?? i + 1,
    }));
  });
}

export type LfTag = { name: string; count?: number };

/** https://www.last.fm/api/show/artist.getTopTags  (`count` is not in the documented sample, so optional) */
export function getArtistTopTags(artist: { name: string; mbid?: string }): Promise<LfTag[]> {
  return cached(`lastfm.artisttags.${artist.name.toLowerCase()}`, 7 * DAY, async () => {
    const body = await call("artist.getTopTags", { artist: artist.name, autocorrect: 1 });
    const root = body.toptags as Record<string, unknown> | undefined;
    return asArray(root?.tag).map((t) => ({ name: (str(t.name) ?? "").toLowerCase(), count: num(t.count) }));
  });
}

export type LfSimilar = { name: string; mbid?: string; match: number; url?: string };

/** https://www.last.fm/api/show/artist.getSimilar  (`match` 0..1) */
export function getSimilarArtists(artist: { name: string }, limit = 20): Promise<LfSimilar[]> {
  return cached(`lastfm.similar.${artist.name.toLowerCase()}.${limit}`, 7 * DAY, async () => {
    const body = await call("artist.getSimilar", { artist: artist.name, limit, autocorrect: 1 });
    const root = body.similarartists as Record<string, unknown> | undefined;
    return asArray(root?.artist).map((a) => ({
      name: str(a.name) ?? "",
      mbid: str(a.mbid) || undefined,
      match: num(a.match) ?? 0,
      url: str(a.url),
    }));
  });
}

/** https://www.last.fm/api/show/tag.getSimilar  (reported broken in the Last.fm forum; empty result is handled upstream) */
export function getSimilarTags(tag: string): Promise<string[]> {
  return cached(`lastfm.similartags.${tag}`, 7 * DAY, async () => {
    const body = await call("tag.getSimilar", { tag });
    const root = body.similartags as Record<string, unknown> | undefined;
    return asArray(root?.tag).map((t) => (str(t.name) ?? "").toLowerCase()).filter(Boolean);
  });
}

export type LfChartRange = { from: number; to: number };

/** https://www.last.fm/api/show/user.getWeeklyChartList */
export function getWeeklyChartList(user: string): Promise<LfChartRange[]> {
  return cached(`lastfm.chartlist.${user}`, 7 * DAY, async () => {
    const body = await call("user.getWeeklyChartList", { user });
    const root = body.weeklychartlist as Record<string, unknown> | undefined;
    return asArray(root?.chart)
      .map((c) => ({ from: num(c.from) ?? 0, to: num(c.to) ?? 0 }))
      .filter((c) => c.from > 0 && c.to > c.from);
  });
}

/**
 * https://www.last.fm/api/show/user.getWeeklyArtistChart
 * We request a whole year (first week's `from` to last week's `to`). That aggregation across
 * several weeks is an assumption, not documented; `rangeHonoured` in the result reports whether it held.
 */
export function getArtistChart(user: string, range: LfChartRange, ttlMs: number) {
  return cached(`lastfm.artistchart.${user}.${range.from}.${range.to}`, ttlMs, async () => {
    const body = await call("user.getWeeklyArtistChart", { user, from: range.from, to: range.to });
    const root = body.weeklyartistchart as Record<string, unknown> | undefined;
    const attr = (root?.["@attr"] ?? {}) as Record<string, unknown>;
    const artists: LfArtist[] = asArray(root?.artist).map((a, i) => ({
      name: str(a.name) ?? "",
      mbid: str(a.mbid) || undefined,
      url: str(a.url),
      plays: num(a.playcount) ?? 0,
      rank: num((a["@attr"] as Record<string, unknown> | undefined)?.rank) ?? i + 1,
    }));
    return { artists, rangeHonoured: num(attr.from) === range.from && num(attr.to) === range.to };
  });
}

/** https://www.last.fm/api/show/artist.getInfo  (`stats.listeners`), used for the "Popular" view. */
export function getArtistListeners(name: string): Promise<number | null> {
  return cached(`lastfm.listeners.${name.toLowerCase()}`, 7 * DAY, async () => {
    try {
      const body = await call("artist.getInfo", { artist: name, autocorrect: 1 });
      const stats = ((body.artist as Record<string, unknown> | undefined)?.stats ?? {}) as Record<string, unknown>;
      return num(stats.listeners) ?? null;
    } catch (e) {
      if (e instanceof LastfmError && e.code === 6) return null; // artist not found
      throw e;
    }
  });
}
