import "server-only";
import { DAY, cached } from "../cache";
import { HttpError, throttledFetch } from "../http";
import { asArray, num, str } from "./parse";

/**
 * MusicBrainz web service v2.
 * Docs checked 2026-09-26: https://musicbrainz.org/doc/MusicBrainz_API ,
 * rate limit 1 req/s per IP, meaningful User-Agent required:
 * https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
 * Genres/tags are supplementary data under CC BY-NC-SA 3.0 (attribution shown in the app).
 */

const ROOT = "https://musicbrainz.org/ws/2";
const GAP_MS = 1100;

export type MbArtist = {
  mbid: string;
  name: string;
  genres: string[];
  beginYear?: number;
  endYear?: number;
  ended?: boolean;
};

async function get(path: string): Promise<Record<string, unknown>> {
  const url = `${ROOT}${path}${path.includes("?") ? "&" : "?"}fmt=json`;
  const res = await throttledFetch(url, GAP_MS);
  if (!res.ok) throw new HttpError(res.status, url, `MusicBrainz HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function year(v: unknown): number | undefined {
  const s = str(v);
  return s ? num(s.slice(0, 4)) : undefined;
}

/** Lookup with genres: /artist/<MBID>?inc=genres */
export function lookupArtist(mbid: string): Promise<MbArtist | null> {
  return cached(`mb.artist.${mbid}`, 30 * DAY, async () => {
    try {
      const a = await get(`/artist/${encodeURIComponent(mbid)}?inc=genres`);
      const life = (a["life-span"] ?? {}) as Record<string, unknown>;
      return {
        mbid,
        name: str(a.name) ?? "",
        genres: asArray(a.genres)
          .sort((x, y) => (num(y.count) ?? 0) - (num(x.count) ?? 0))
          .map((g) => (str(g.name) ?? "").toLowerCase())
          .filter(Boolean),
        beginYear: year(life.begin),
        endYear: year(life.end),
        ended: life.ended === true,
      };
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  });
}

/** Search by name, accept only a confident exact match: /artist?query=artist:"…" */
export function findArtistMbid(name: string): Promise<string | null> {
  return cached(`mb.search.${name.toLowerCase()}`, 30 * DAY, async () => {
    const q = encodeURIComponent(`artist:"${name.replaceAll('"', "")}"`);
    const body = await get(`/artist?query=${q}&limit=3`);
    const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
    const hit = asArray(body.artists).find((a) => (num(a.score) ?? 0) >= 95 && norm(str(a.name) ?? "") === norm(name));
    return hit ? (str(hit.id) ?? null) : null;
  });
}
