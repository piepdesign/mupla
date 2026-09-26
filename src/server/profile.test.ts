import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Wiring test for the profile orchestrator with a fake fetch.
 * Response shapes follow the Last.fm JSON format (documented XML samples converted: attributes -> "@attr", numbers as strings).
 * The real shapes still need one live check on the debug page.
 */

const year = (y: number, w: number) => Math.floor(Date.UTC(y, 0, 1 + w * 7) / 1000);

function lastfm(url: URL): unknown {
  const m = url.searchParams.get("method");
  const period = url.searchParams.get("period");
  switch (m) {
    case "user.getTopArtists":
      return {
        topartists: {
          artist: [
            { name: "Bonobo", playcount: period === "overall" ? "812" : "40", mbid: "9a709693-b4f8-4da9-8cc1-038c911a61be", url: "https://www.last.fm/music/Bonobo", "@attr": { rank: "1" } },
            { name: "Tycho", playcount: "20", mbid: "", url: "https://www.last.fm/music/Tycho", "@attr": { rank: "2" } },
          ],
          "@attr": { user: "fynn" },
        },
      };
    case "artist.getTopTags":
      return { toptags: { tag: [{ name: "Electronic", count: 100 }, { name: "seen live", count: 80 }, { name: "downtempo", count: 60 }] } };
    case "artist.getSimilar":
      return { similarartists: { artist: [{ name: "Emancipator", mbid: "", match: "0.93" }, { name: "Tycho", match: "0.8" }] } };
    case "tag.getSimilar":
      return { similartags: { tag: [] } };
    case "user.getWeeklyChartList":
      return { weeklychartlist: { chart: [2023, 2024].flatMap((y) => [0, 1].map((w) => ({ "#text": "", from: String(year(y, w)), to: String(year(y, w + 1)) }))) } };
    case "user.getWeeklyArtistChart": {
      const from = url.searchParams.get("from")!;
      const to = url.searchParams.get("to")!;
      const y = new Date(Number(from) * 1000).getUTCFullYear();
      return { weeklyartistchart: { artist: y === 2023 ? { name: "Moderat", playcount: "300", "@attr": { rank: "1" } } : [], "@attr": { from, to } } };
    }
  }
  return { error: 3, message: "Invalid Method" };
}

function musicbrainz(url: URL): unknown {
  if (url.pathname.endsWith("/artist")) return { artists: [{ id: "tycho-mbid", name: "Tycho", score: 100 }] };
  return { id: "x", name: "x", genres: [{ name: "ambient", count: 3 }, { name: "electronic", count: 9 }], "life-span": { begin: "1999" } };
}

let cwd: string;
beforeAll(() => {
  cwd = process.cwd();
  process.chdir(mkdtempSync(join(tmpdir(), "mupla-")));
  process.env.LASTFM_API_KEY = "test";
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    const body = url.host === "musicbrainz.org" ? musicbrainz(url) : lastfm(url);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  });
});
afterAll(() => {
  process.chdir(cwd);
  vi.unstubAllGlobals();
});

describe("getTasteProfile", () => {
  it("builds a complete profile from Last.fm and MusicBrainz responses", async () => {
    const { getTasteProfile } = await import("./profile");
    const { profile, diagnostics } = await getTasteProfile("fynn");

    expect(profile.topArtists.map((a) => a.artist.name)).toEqual(["Bonobo", "Tycho"]);
    expect(profile.topArtists[0].plays).toBe(812);
    expect(profile.topArtists[1].artist.mbid).toBe("tycho-mbid");
    expect(profile.topArtists[0].artist.genres).toEqual(["electronic", "ambient"]);
    expect(profile.topTags.map((t) => t.tag)).toEqual(["electronic", "downtempo"]);
    expect(profile.adjacentArtists).toEqual([expect.objectContaining({ via: "Bonobo", match: 0.93 })]);
    expect(diagnostics.tagGetSimilarWorked).toBe(false);
    expect(profile.adjacentTags.every((t) => t.method === "similar-artists")).toBe(true);
    expect(diagnostics.yearAggregationHonoured).toBe(true);
    expect(profile.dormantArtists).toEqual([expect.objectContaining({ lastHeavyPeriod: "2023", plays: 300 })]);
    expect(profile.dormantArtists[0].artist.name).toBe("Moderat");
  }, 30_000);
});
