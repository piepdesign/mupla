import { describe, it, expect } from "vitest";
import {
  weightTopArtists,
  aggregateTags,
  collectAdjacentArtists,
  collectAdjacentTags,
  findDormant,
  yearRanges,
  key,
  type RankedArtist,
} from "./profile";

describe("weightTopArtists", () => {
  it("weights artist in 1month only at 0.45 of their max", () => {
    const result = weightTopArtists({
      "1month": [{ name: "Artist A", plays: 100, rank: 1 }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "Artist A", weight: 0.45 });
  });

  it("combines weights across periods (max in all three gets 1.0)", () => {
    const artists = { name: "Artist A", plays: 100, rank: 1 };
    const result = weightTopArtists({
      "1month": [artists],
      "6month": [artists],
      overall: [artists],
    });
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBeCloseTo(0.45 + 0.35 + 0.2, 5);
  });

  it("normalizes plays within each period (max play = weight 1.0 for that period)", () => {
    const result = weightTopArtists({
      "1month": [
        { name: "A", plays: 50, rank: 1 },
        { name: "B", plays: 100, rank: 2 },
      ],
    });
    const a = result.find((r) => r.name === "A");
    const b = result.find((r) => r.name === "B");
    expect(a?.weight).toBeCloseTo(0.45 * 0.5, 5);
    expect(b?.weight).toBeCloseTo(0.45, 5);
  });

  it("merges artists case-insensitively by key (NFKC + lowercase)", () => {
    const result = weightTopArtists({
      "1month": [{ name: "Artist A", plays: 100, rank: 1 }],
      "6month": [{ name: "artist a", plays: 50, rank: 1 }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Artist A");
    // Each period calculates max independently: 1month max=100, 6month max=50
    // So: 0.45 * (100/100) + 0.35 * (50/50) = 0.45 + 0.35 = 0.8
    expect(result[0].weight).toBeCloseTo(0.8, 5);
  });

  it("uses overall plays as the single plays count", () => {
    const result = weightTopArtists({
      "1month": [{ name: "Artist A", plays: 100, rank: 1 }],
      overall: [{ name: "Artist A", plays: 500, rank: 1 }],
    });
    expect(result[0].plays).toBe(500);
  });

  it("uses max plays from 1month/6month when overall not present", () => {
    const result = weightTopArtists({
      "1month": [{ name: "Artist A", plays: 100, rank: 1 }],
      "6month": [{ name: "Artist A", plays: 80, rank: 1 }],
    });
    expect(result[0].plays).toBe(100);
  });

  it("preserves mbid from any period", () => {
    const result = weightTopArtists({
      "1month": [{ name: "Artist A", plays: 100, rank: 1, mbid: "abc123" }],
      "6month": [{ name: "Artist A", plays: 50, rank: 1 }],
    });
    expect(result[0].mbid).toBe("abc123");
  });

  it("sorts by weight descending", () => {
    const result = weightTopArtists({
      overall: [
        { name: "A", plays: 100, rank: 1 },
        { name: "B", plays: 50, rank: 2 },
      ],
    });
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });

  it("handles empty byPeriod", () => {
    const result = weightTopArtists({});
    expect(result).toEqual([]);
  });

  it("handles empty lists in byPeriod", () => {
    const result = weightTopArtists({
      "1month": [],
      "6month": [],
      overall: [],
    });
    expect(result).toEqual([]);
  });
});

describe("aggregateTags", () => {
  it("excludes blocklisted tags", () => {
    const artists = [{ name: "Artist A", weight: 1.0 }];
    const tags = new Map([
      [
        "artist a",
        [
          { name: "rock", count: 100 },
          { name: "seen live", count: 50 },
        ],
      ],
    ]);
    const result = aggregateTags(artists, tags);
    expect(result.map((t) => t.tag)).not.toContain("seen live");
    expect(result.map((t) => t.tag)).toContain("rock");
  });

  it("uses count/100 when count is present", () => {
    const artists = [{ name: "Artist A", weight: 1.0 }];
    const tags = new Map([["artist a", [{ name: "rock", count: 50 }]]]);
    const result = aggregateTags(artists, tags);
    // Raw weight: 1.0 * (50/100) = 0.5, then normalized by max (0.5) = 1.0
    expect(result[0].weight).toBeCloseTo(1.0, 5);
  });

  it("uses rank fallback (1 - i/perArtist) when count missing", () => {
    const artists = [{ name: "Artist A", weight: 1.0 }];
    const tags = new Map([
      ["artist a", [{ name: "rock" }, { name: "pop" }, { name: "jazz" }]],
    ]);
    const result = aggregateTags(artists, tags);
    const rock = result.find((t) => t.tag === "rock");
    const pop = result.find((t) => t.tag === "pop");
    expect(rock?.weight).toBeCloseTo(1.0, 5);
    expect(pop?.weight).toBeCloseTo(0.8, 5);
  });

  it("respects perArtist limit", () => {
    const artists = [{ name: "Artist A", weight: 1.0 }];
    const tags = new Map([
      [
        "artist a",
        [
          { name: "rock", count: 100 },
          { name: "pop", count: 100 },
          { name: "jazz", count: 100 },
          { name: "metal", count: 100 },
          { name: "blues", count: 100 },
          { name: "folk", count: 100 },
        ],
      ],
    ]);
    const result = aggregateTags(artists, tags, 3);
    expect(result.length).toBe(3);
  });

  it("normalizes so top weight is 1.0", () => {
    const artists = [{ name: "A", weight: 1.0 }];
    const tags = new Map([["a", [{ name: "rock", count: 50 }]]]);
    const result = aggregateTags(artists, tags);
    expect(Math.max(...result.map((t) => t.weight))).toBeCloseTo(1.0, 5);
  });

  it("aggregates tags from multiple weighted artists", () => {
    const artists = [
      { name: "A", weight: 0.8 },
      { name: "B", weight: 0.6 },
    ];
    const tags = new Map([
      ["a", [{ name: "rock", count: 100 }]],
      ["b", [{ name: "rock", count: 100 }]],
    ]);
    const result = aggregateTags(artists, tags);
    const rock = result.find((t) => t.tag === "rock");
    expect(rock?.weight).toBeCloseTo(1.0, 5);
  });

  it("excludes empty tag names", () => {
    const artists = [{ name: "A", weight: 1.0 }];
    const tags = new Map([["a", [{ name: "" }, { name: "rock" }]]]);
    const result = aggregateTags(artists, tags);
    expect(result.length).toBe(1);
    expect(result[0].tag).toBe("rock");
  });

  it("handles artists with no tags", () => {
    const artists = [{ name: "A", weight: 1.0 }];
    const tags = new Map<string, { name: string; count?: number }[]>();
    const result = aggregateTags(artists, tags);
    expect(result).toEqual([]);
  });

  it("sorts by weight descending", () => {
    const artists = [{ name: "A", weight: 1.0 }];
    const tags = new Map([
      ["a", [{ name: "rock", count: 100 }, { name: "pop", count: 50 }]],
    ]);
    const result = aggregateTags(artists, tags);
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });
});

describe("collectAdjacentArtists", () => {
  it("excludes known artists (case-insensitive)", () => {
    const sources = [
      {
        via: "Rock",
        similar: [{ name: "Artist A", match: 0.9 }],
      },
    ];
    const known = new Set(["artist a"]);
    const result = collectAdjacentArtists(sources, known);
    expect(result).toHaveLength(0);
  });

  it("excludes matches below minMatch threshold (default 0.2)", () => {
    const sources = [
      {
        via: "Rock",
        similar: [{ name: "Artist A", match: 0.15 }],
      },
    ];
    const result = collectAdjacentArtists(sources, new Set());
    expect(result).toHaveLength(0);
  });

  it("includes matches at exactly minMatch", () => {
    const sources = [
      {
        via: "Rock",
        similar: [{ name: "Artist A", match: 0.2 }],
      },
    ];
    const result = collectAdjacentArtists(sources, new Set());
    expect(result).toHaveLength(1);
  });

  it("keeps strongest link when same artist appears in multiple sources", () => {
    const sources = [
      { via: "Rock", similar: [{ name: "Artist A", match: 0.7 }] },
      { via: "Metal", similar: [{ name: "Artist A", match: 0.9 }] },
    ];
    const result = collectAdjacentArtists(sources, new Set());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Artist A",
      via: "Metal",
      match: 0.9,
    });
  });

  it("preserves mbid from strongest link", () => {
    const sources = [
      {
        via: "Rock",
        similar: [{ name: "Artist A", mbid: "weak", match: 0.5 }],
      },
      {
        via: "Metal",
        similar: [{ name: "Artist A", mbid: "strong", match: 0.9 }],
      },
    ];
    const result = collectAdjacentArtists(sources, new Set());
    expect(result[0].mbid).toBe("strong");
  });

  it("sorts by match descending", () => {
    const sources = [
      {
        via: "Rock",
        similar: [
          { name: "A", match: 0.7 },
          { name: "B", match: 0.9 },
        ],
      },
    ];
    const result = collectAdjacentArtists(sources, new Set());
    expect(result[0].match).toBeGreaterThan(result[1].match);
  });

  it("respects custom minMatch parameter", () => {
    const sources = [
      {
        via: "Rock",
        similar: [{ name: "Artist A", match: 0.5 }],
      },
    ];
    const result = collectAdjacentArtists(sources, new Set(), 0.6);
    expect(result).toHaveLength(0);
  });

  it("handles empty sources", () => {
    const result = collectAdjacentArtists([], new Set());
    expect(result).toEqual([]);
  });
});

describe("collectAdjacentTags", () => {
  it("uses tag.getSimilar as primary method", () => {
    const similarByTag = [{ via: "rock", similar: ["metal", "hard rock"] }];
    const tagsOfAdjacentArtists: { via: string; tags: string[] }[] = [];
    const result = collectAdjacentTags(
      similarByTag,
      tagsOfAdjacentArtists,
      new Set()
    );
    expect(result).toHaveLength(2);
    expect(result[0].method).toBe("tag.getSimilar");
  });

  it("excludes own tags", () => {
    const similarByTag = [{ via: "rock", similar: ["rock", "metal"] }];
    const ownTags = new Set(["rock"]);
    const result = collectAdjacentTags(similarByTag, [], ownTags);
    expect(result.map((t) => t.tag)).not.toContain("rock");
  });

  it("excludes blocklisted tags", () => {
    const similarByTag = [
      { via: "rock", similar: ["metal", "seen live", "pop"] },
    ];
    const result = collectAdjacentTags(similarByTag, [], new Set());
    expect(result.map((t) => t.tag)).not.toContain("seen live");
  });

  it("counts hits from tag.getSimilar", () => {
    const similarByTag = [
      { via: "rock", similar: ["metal"] },
      { via: "metal", similar: ["metal"] },
    ];
    const result = collectAdjacentTags(similarByTag, [], new Set());
    expect(result[0].hits).toBe(2);
  });

  it("falls back to similar-artists when tag.getSimilar returns nothing", () => {
    const similarByTag: { via: string; similar: string[] }[] = [];
    const tagsOfAdjacentArtists = [
      { via: "Artist A", tags: ["rock", "metal"] },
    ];
    const result = collectAdjacentTags(
      similarByTag,
      tagsOfAdjacentArtists,
      new Set()
    );
    expect(result).toHaveLength(2);
    expect(result[0].method).toBe("similar-artists");
  });

  it("does not fall back when tag.getSimilar found results", () => {
    const similarByTag = [{ via: "rock", similar: ["metal"] }];
    const tagsOfAdjacentArtists = [
      { via: "Artist A", tags: ["pop", "jazz"] },
    ];
    const result = collectAdjacentTags(
      similarByTag,
      tagsOfAdjacentArtists,
      new Set()
    );
    expect(result.map((t) => t.tag)).not.toContain("pop");
    expect(result.map((t) => t.tag)).not.toContain("jazz");
  });

  it("respects limit parameter", () => {
    const similarByTag = [
      {
        via: "rock",
        similar: ["a", "b", "c", "d", "e"],
      },
    ];
    const result = collectAdjacentTags(similarByTag, [], new Set(), 2);
    expect(result).toHaveLength(2);
  });

  it("sorts by hits descending", () => {
    const similarByTag = [
      { via: "rock", similar: ["metal"] },
      { via: "metal", similar: ["metal", "pop"] },
    ];
    const result = collectAdjacentTags(similarByTag, [], new Set());
    const metal = result.find((t) => t.tag === "metal");
    const pop = result.find((t) => t.tag === "pop");
    expect(metal?.hits).toBeGreaterThan(pop?.hits || 0);
  });

  it("handles empty input", () => {
    const result = collectAdjacentTags([], [], new Set());
    expect(result).toEqual([]);
  });
});

describe("findDormant", () => {
  it("finds artist in top 20 of past year, absent in later years and recent", () => {
    const yearCharts = [
      { year: 2023, artists: [{ name: "A", plays: 100, rank: 1 }] },
      { year: 2024, artists: [{ name: "B", plays: 100, rank: 1 }] },
    ];
    const recent = [{ name: "C", plays: 100, rank: 1 }];
    const result = findDormant(yearCharts, recent);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "A", year: 2023 });
  });

  it("excludes artist present in recent top 50", () => {
    const yearCharts = [
      { year: 2023, artists: [{ name: "A", plays: 100, rank: 1 }] },
      { year: 2024, artists: [] },
    ];
    const recent = Array.from({ length: 50 }, (_, i) => ({
      name: i === 0 ? "A" : `Artist ${i}`,
      plays: 100,
      rank: i + 1,
    }));
    const result = findDormant(yearCharts, recent);
    expect(result).toHaveLength(0);
  });

  it("excludes artist whose last top-20 year is the latest chart year", () => {
    const yearCharts = [
      { year: 2023, artists: [{ name: "A", plays: 100, rank: 1 }] },
      { year: 2024, artists: [{ name: "A", plays: 100, rank: 1 }] },
    ];
    const recent: RankedArtist[] = [];
    const result = findDormant(yearCharts, recent);
    expect(result).toHaveLength(0);
  });

  it("reports most recent dormancy year for artist in multiple past years", () => {
    const yearCharts = [
      { year: 2022, artists: [{ name: "A", plays: 100, rank: 1 }] },
      { year: 2023, artists: [{ name: "A", plays: 100, rank: 1 }] },
      { year: 2024, artists: [] },
    ];
    const recent: RankedArtist[] = [];
    const result = findDormant(yearCharts, recent, 20);
    // 2024 is latest, so excluded. A's last top-20 year is 2023, which is not latest, so included
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2023);
  });

  it("respects topN parameter for which artists qualify", () => {
    const yearCharts = [
      {
        year: 2023,
        artists: Array.from({ length: 25 }, (_, i) => ({
          name: `Artist ${i}`,
          plays: 100 - i,
          rank: i + 1,
        })),
      },
      { year: 2024, artists: [] },
    ];
    const result = findDormant(yearCharts, [], 20);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("sorts by year descending, then by plays descending", () => {
    const yearCharts = [
      { year: 2022, artists: [{ name: "A", plays: 50, rank: 1 }] },
      { year: 2023, artists: [{ name: "B", plays: 100, rank: 1 }] },
      { year: 2024, artists: [] },
    ];
    const recent: RankedArtist[] = [];
    const result = findDormant(yearCharts, recent);
    // 2024 is latest so excluded. B (2023) is dormant, A (2022) is dormant. Sorted by year desc
    expect(result[0].year).toBe(2023);
    expect(result[1].year).toBe(2022);
  });

  it("handles empty year charts", () => {
    const result = findDormant([], [], 20);
    expect(result).toEqual([]);
  });

  it("preserves mbid when present", () => {
    const yearCharts = [
      {
        year: 2023,
        artists: [{ name: "A", plays: 100, rank: 1, mbid: "abc123" }],
      },
      { year: 2024, artists: [] },
    ];
    const result = findDormant(yearCharts, []);
    expect(result[0].mbid).toBe("abc123");
  });
});

describe("yearRanges", () => {
  it("groups charts by UTC year", () => {
    const charts = [
      { from: new Date("2023-01-15").getTime() / 1000, to: new Date("2023-01-22").getTime() / 1000 },
      { from: new Date("2023-02-01").getTime() / 1000, to: new Date("2023-02-08").getTime() / 1000 },
    ];
    const now = new Date("2024-01-01");
    const result = yearRanges(charts, 10, now);
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2023);
  });

  it("merges min from / max to for same year", () => {
    const charts = [
      { from: 1000, to: 2000 },
      { from: 1500, to: 2500 },
    ];
    const now = new Date("2024-01-01");
    const result = yearRanges(charts, 10, now);
    expect(result[0]).toMatchObject({ from: 1000, to: 2500 });
  });

  it("excludes current year (pass now explicitly)", () => {
    const charts = [
      { from: new Date("2024-01-01").getTime() / 1000, to: new Date("2024-01-08").getTime() / 1000 },
      { from: new Date("2023-01-01").getTime() / 1000, to: new Date("2023-01-08").getTime() / 1000 },
    ];
    const now = new Date("2024-06-15");
    const result = yearRanges(charts, 10, now);
    expect(result.map((r) => r.year)).not.toContain(2024);
    expect(result.map((r) => r.year)).toContain(2023);
  });

  it("sorts newest first (year descending)", () => {
    const charts = [
      { from: new Date("2023-01-01").getTime() / 1000, to: new Date("2023-01-08").getTime() / 1000 },
      { from: new Date("2022-01-01").getTime() / 1000, to: new Date("2022-01-08").getTime() / 1000 },
      { from: new Date("2021-01-01").getTime() / 1000, to: new Date("2021-01-08").getTime() / 1000 },
    ];
    const now = new Date("2024-01-01");
    const result = yearRanges(charts, 10, now);
    expect(result[0].year).toBe(2023);
    expect(result[1].year).toBe(2022);
    expect(result[2].year).toBe(2021);
  });

  it("respects maxYears limit", () => {
    const charts = [
      { from: new Date("2023-01-01").getTime() / 1000, to: new Date("2023-01-08").getTime() / 1000 },
      { from: new Date("2022-01-01").getTime() / 1000, to: new Date("2022-01-08").getTime() / 1000 },
      { from: new Date("2021-01-01").getTime() / 1000, to: new Date("2021-01-08").getTime() / 1000 },
    ];
    const now = new Date("2024-01-01");
    const result = yearRanges(charts, 2, now);
    expect(result).toHaveLength(2);
  });

  it("handles empty charts", () => {
    const result = yearRanges([], 10);
    expect(result).toEqual([]);
  });

  it("uses Date now() when now parameter omitted", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 2);
    const charts = [
      { from: Math.floor(past.getTime() / 1000), to: Math.floor(past.getTime() / 1000) + 86400 },
    ];
    const result = yearRanges(charts, 10);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("key function", () => {
  it("normalizes to NFKC and lowercases", () => {
    expect(key("Artist A")).toBe("artist a");
    expect(key("ARTIST A")).toBe("artist a");
  });

  it("trims whitespace", () => {
    expect(key("  Artist A  ")).toBe("artist a");
  });

  it("handles accented characters", () => {
    expect(key("Café")).toBe("café");
  });
});
