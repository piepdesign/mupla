import { describe, expect, it } from "vitest";
import type { MusicEvent, TasteProfile } from "./types";
import {
  PROFILE,
  WEIGHTS,
  buildProfileIndex,
  matchEvent,
  priceFriction,
  reachability,
  scoreMatch,
  timing,
  totalScore,
} from "./scoring";
import { applyView, type Candidate } from "./curation";

const NOW = new Date("2026-09-26T12:00:00Z");
const HOME = { lat: 50.5841, lon: 8.6784 };
const src = [{ provider: "ticketmaster", externalId: "x", url: "", fetchedAt: "" }];
const a = (name: string, genres: string[] = []) => ({ id: name, name, genres, sources: src });

function ev(p: Partial<MusicEvent> & { acts?: string[]; days?: number }): MusicEvent {
  const start = new Date(NOW.getTime() + (p.days ?? 45) * 86_400_000).toISOString();
  return {
    id: p.id ?? "e",
    kind: p.kind ?? "concert",
    title: p.title ?? (p.acts?.[0] ?? "X"),
    startsAt: start,
    startTimeKnown: true,
    venue: p.venue ?? { id: "v", name: "Halle", city: "Frankfurt", country: "DE", lat: 50.11, lon: 8.68, sources: src },
    lineup: (p.acts ?? []).map((n, i) => ({ artist: a(n), role: p.kind === "festival" ? "lineup" : i === 0 ? "headliner" : "support" })),
    genres: p.genres ?? [],
    size: "hall",
    status: p.status ?? "onsale",
    price: p.price,
    sources: src,
  };
}

const profile: TasteProfile = {
  username: "t",
  builtAt: "",
  topArtists: [
    { artist: a("Bonobo"), plays: 812, weight: 1 },
    { artist: a("Tycho"), plays: 300, weight: 0.5 },
    { artist: a("Moderat"), plays: 200, weight: 0.4 },
  ],
  topTags: [{ tag: "electronic", weight: 1 }, { tag: "ambient", weight: 0.5 }],
  adjacentArtists: [{ artist: a("Emancipator"), via: "Bonobo", match: 0.9 }],
  adjacentTags: [{ tag: "neoclassical", via: "ambient", method: "tag.getSimilar" }],
  dormantArtists: [{ artist: a("Moderat"), lastHeavyPeriod: "2023", plays: 200 }],
};
const idx = buildProfileIndex(profile);
const settings = { home: HOME, discoveryLevel: 0.3, now: NOW };

describe("component curves", () => {
  it("reachability is degressive: near is nearly free, beyond 300 km it collapses", () => {
    expect(reachability(0)).toBe(1);
    expect(reachability(50)).toBeCloseTo(0.9);
    expect(reachability(300)).toBeCloseTo(0.4);
    expect(reachability(500)).toBeLessThan(0.15);
    expect(reachability(undefined)).toBe(0.5);
    for (let km = 0; km < 800; km += 25) expect(reachability(km + 25)).toBeLessThanOrEqual(reachability(km));
  });

  it("timing peaks between 4 and 10 weeks", () => {
    expect(timing(1)).toBeLessThan(0.6);
    expect(timing(28)).toBe(1);
    expect(timing(70)).toBe(1);
    expect(timing(200)).toBeLessThan(1);
    expect(timing(365)).toBeCloseTo(0.3);
    expect(timing(10)).toBeLessThan(timing(40));
    expect(timing(300)).toBeLessThan(timing(40));
  });

  it("price friction is soft and only above the limit", () => {
    expect(priceFriction({ min: 40, currency: "EUR" }, 50)).toBe(0);
    expect(priceFriction({ min: 75, currency: "EUR" }, 50)).toBeCloseTo(0.5);
    expect(priceFriction({ min: 500, currency: "EUR" }, 50)).toBe(1);
    expect(priceFriction(undefined, 50)).toBe(0);
    expect(priceFriction({ min: 75, currency: "CHF" }, 50)).toBe(0);
  });

  it("total score is exactly the weighted sum", () => {
    const c = { profileMatch: 0.8, reachability: 0.5, timing: 1, discovery: 0.2, priceFriction: 0.5 };
    expect(totalScore(c)).toBeCloseTo(0.55 * 0.8 + 0.15 * 0.5 + 0.15 * 1 + 0.15 * 0.2 - 0.2 * 0.5);
    expect(WEIGHTS.profileMatch).toBe(0.55);
  });
});

describe("scoreMatch and reasons", () => {
  const score = (e: MusicEvent, s = settings) => {
    const m = matchEvent(e, idx);
    return m ? scoreMatch(e, m, s) : null;
  };

  it("direct artist: reason carries the real play count", () => {
    const r = score(ev({ acts: ["Bonobo"] }))!;
    expect(r.reasons[0]).toEqual({ type: "direct-artist", artist: "Bonobo", plays: 812 });
    expect(r.components.profileMatch).toBeCloseTo(PROFILE.directBase + PROFILE.directWeightShare);
    expect(r.score).toBeCloseTo(totalScore(r.components));
  });

  it("similar artist: reason names the origin", () => {
    const r = score(ev({ acts: ["Emancipator"] }))!;
    expect(r.reasons[0]).toEqual({ type: "similar-artist", artist: "Emancipator", via: "Bonobo" });
    expect(r.components.discovery).toBe(0.3);
  });

  it("festival: line-up hits are summed but capped", () => {
    const small = score(ev({ kind: "festival", acts: ["Bonobo", "Tycho"] }))!;
    const big = score(ev({ kind: "festival", acts: ["Bonobo", "Tycho", "Moderat", "Emancipator", ...Array.from({ length: 200 }, (_, i) => `N${i}`)] }))!;
    expect(small.reasons[0]).toMatchObject({ type: "lineup-match", count: 2 });
    expect(big.reasons[0]).toMatchObject({ type: "lineup-match", count: 3 });
    expect(big.components.profileMatch).toBeLessThanOrEqual(1);
  });

  it("dormant artist gets the Wiedersehen reason", () => {
    const r = score(ev({ acts: ["Moderat"] }))!;
    expect(r.reasons.map((x) => x.type)).toContain("dormant-artist");
  });

  it("genre-only match needs discovery; at 0 it is dropped unless it is the top genre", () => {
    const weak = ev({ acts: ["Unknown"], genres: ["ambient"] });
    expect(score(weak, { ...settings, discoveryLevel: 0 })).toBeNull();
    const r = score(weak, { ...settings, discoveryLevel: 0.6 })!;
    expect(r.reasons[0]).toMatchObject({ type: "genre-match", tag: "ambient", artist: undefined });
  });

  it("genre reason names the act whose tags matched, so different events get different reasons", () => {
    const withTags = (name: string, genres: string[]) => {
      const e = ev({ acts: [name], genres: ["electronic"] });
      e.lineup[0].artist.genres = genres;
      return e;
    };
    const r1 = score(withTags("Unknown A", ["ambient"]), { ...settings, discoveryLevel: 0.6 })!;
    const r2 = score(withTags("Unknown B", ["ambient"]), { ...settings, discoveryLevel: 0.6 })!;
    expect(r1.reasons[0]).toMatchObject({ type: "genre-match", tag: "ambient", artist: "Unknown A" });
    expect(r2.reasons[0]).toMatchObject({ type: "genre-match", tag: "ambient", artist: "Unknown B" });
  });

  it("names the genre source: provider classification before Last.fm tags", () => {
    const e = ev({ acts: ["GoldFord"], genres: [] });
    e.sources = [{ provider: "ticketmaster", externalId: "x", url: "https://example.org", fetchedAt: "2026-09-26T00:00:00Z" }];
    e.lineup[0].artist.genres = ["ambient"];
    e.lineup[0].artist.tags = ["ambient", "neoclassical"];
    const m = matchEvent(e, idx)!;
    expect(m.genres[0]).toMatchObject({ tag: "ambient", artist: "GoldFord", source: "ticketmaster" });
    expect(m.adjacentGenres[0]).toMatchObject({ tag: "neoclassical", artist: "GoldFord", source: "lastfm" });
    const onlyTags = ev({ acts: ["GoldFord"], genres: [] });
    onlyTags.lineup[0].artist.tags = ["ambient"];
    expect(matchEvent(onlyTags, idx)!.genres[0]).toMatchObject({ tag: "ambient", source: "lastfm" });
  });

  it("umbrella genres count half and give way to a specific tag", () => {
    const broadOnly = matchEvent(ev({ acts: ["Unknown"], genres: ["electronic"] }), idx)!;
    expect(broadOnly.genres[0]).toMatchObject({ tag: "electronic", weight: 0.5, broad: true });
    const e = ev({ acts: ["Unknown"], genres: ["electronic"] });
    e.lineup[0].artist.genres = ["ambient"];
    expect(matchEvent(e, idx)!.genres.map((g) => g.tag)).toEqual(["ambient"]);
  });

  it("profile tags are normalised like event genres", () => {
    const p2 = { ...profile, topTags: [{ tag: "Hip Hop", weight: 1 }] };
    expect(matchEvent(ev({ acts: ["X"], genres: ["hip-hop"] }), buildProfileIndex(p2))!.genres[0].tag).toBe("hip-hop");
  });

  it("adjacent genre only counts with discovery and says so", () => {
    const e = ev({ acts: ["Unknown"], genres: ["neoclassical"] });
    expect(score(e, { ...settings, discoveryLevel: 0 })).toBeNull();
    const r = score(e, { ...settings, discoveryLevel: 0.8 })!;
    expect(r.reasons[0]).toMatchObject({ type: "adjacent-genre", tag: "neoclassical", via: "ambient" });
    expect(r.components.profileMatch).toBe(0);
  });

  it("no profile relation, no card", () => {
    expect(matchEvent(ev({ acts: ["Nobody"], genres: ["polka"] }), idx)).toBeNull();
  });

  it("every reason is backed by the match that produced the components", () => {
    const events = [
      ev({ acts: ["Bonobo"] }),
      ev({ acts: ["Emancipator"] }),
      ev({ acts: ["Moderat"] }),
      ev({ kind: "festival", acts: ["Bonobo", "Tycho", "Emancipator"] }),
      ev({ acts: ["X"], genres: ["electronic"] }),
    ];
    for (const e of events) {
      const m = matchEvent(e, idx)!;
      const r = scoreMatch(e, m, { ...settings, discoveryLevel: 1 })!;
      for (const reason of r.reasons) {
        if (reason.type === "direct-artist") expect(m.direct.map((d) => d.name)).toContain(reason.artist);
        if (reason.type === "lineup-match") expect(reason.count).toBe(m.direct.length);
        if (reason.type === "similar-artist") expect(m.similar.map((s) => s.name)).toContain(reason.artist);
        if (reason.type === "dormant-artist") expect(m.dormant.map((d) => d.name)).toContain(reason.artist);
        if (reason.type === "genre-match") expect(m.genres.map((g) => g.tag)).toContain(reason.tag);
        if (reason.type === "adjacent-genre") expect(m.adjacentGenres.map((g) => g.tag)).toContain(reason.tag);
      }
    }
  });
});

describe("views", () => {
  const cands: Candidate[] = [
    ev({ id: "near", acts: ["Tycho"], days: 3, venue: { id: "g", name: "Club", city: "Gießen", country: "DE", lat: 50.58, lon: 8.67, sources: src } }),
    ev({ id: "far", acts: ["Bonobo"], days: 45, venue: { id: "b", name: "Halle", city: "Berlin", country: "DE", lat: 52.52, lon: 13.4, sources: src } }),
    ev({ id: "fest", kind: "festival", acts: ["Bonobo", "Tycho"], days: 200 }),
    ev({ id: "sold", acts: ["Moderat"], days: 5, status: "soldout" }),
  ].map((event) => ({ event, match: matchEvent(event, idx)! }));
  const ctx = { ...settings, ledgerCreatedAt: NOW.toISOString() };

  it("nearby sorts by distance", () => {
    expect(applyView("nearby", cands, ctx).items[0].event.id).toBe("near");
  });
  it("season only has festivals", () => {
    expect(applyView("season", cands, ctx).items.map((r) => r.event.id)).toEqual(["fest"]);
  });
  it("last chance excludes sold out and far future", () => {
    expect(applyView("last-chance", cands, ctx).items.map((r) => r.event.id)).toEqual(["near"]);
  });
  it("upcoming is chronological", () => {
    const ids = applyView("upcoming", cands, ctx).items.map((r) => r.event.id);
    expect(ids[0]).toBe("near");
    expect(ids.at(-1)).toBe("fest");
  });
  it("new stays empty on the first run instead of calling everything new", () => {
    const seen = cands.map((c) => ({ ...c, event: { ...c.event, firstSeenAt: NOW.toISOString() } }));
    expect(applyView("new", seen, ctx).items).toEqual([]);
  });
  it("every view item has at least one reason", () => {
    for (const v of ["for-you", "upcoming", "nearby", "popular", "season", "rewind", "off-the-grid", "timeframe"] as const) {
      for (const r of applyView(v, cands, ctx).items) expect(r.reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("timeframe view", () => {
  const cands: Candidate[] = [3, 20, 60].map((days) => {
    const event = ev({ id: `d${days}`, acts: ["Bonobo"], days });
    return { event, match: matchEvent(event, idx)! };
  });
  const ctx = { ...settings, ledgerCreatedAt: NOW.toISOString() };
  const ids = (span: "week" | "month" | "year") => applyView("timeframe", cands, { ...ctx, span }).items.map((r) => r.event.id).sort();
  it("rotates week, month and year", () => {
    expect(ids("week")).toEqual(["d3"]);
    expect(ids("month")).toEqual(["d20", "d3"]);
    expect(ids("year")).toEqual(["d20", "d3", "d60"]);
  });
});
