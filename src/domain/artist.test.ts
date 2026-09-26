import { describe, expect, it } from "vitest";
import type { MusicEvent, TasteProfile } from "./types";
import { artistAppearances, artistHistory } from "./artist";

const src = [{ provider: "ticketmaster", externalId: "x", url: "", fetchedAt: "" }];

const artist = (name: string, genres: string[] = []) => ({
  id: name,
  name,
  genres,
  sources: src,
});

function ev(p: Partial<MusicEvent> & { acts?: Array<{ name: string; role: "headliner" | "support" | "lineup" }> }): MusicEvent {
  return {
    id: p.id ?? "e",
    kind: p.kind ?? "concert",
    title: p.title ?? (p.acts?.[0]?.name ?? "X"),
    startsAt: p.startsAt ?? "2026-10-15T20:00:00+02:00",
    startTimeKnown: p.startTimeKnown ?? true,
    endsAt: p.endsAt,
    venue: p.venue ?? {
      id: "v",
      name: "Halle",
      city: "Frankfurt",
      country: "DE",
      sources: src,
    },
    lineup: (p.acts ?? []).map((act) => ({
      artist: artist(act.name),
      role: act.role,
    })),
    genres: p.genres ?? [],
    size: p.size ?? "hall",
    status: p.status ?? "onsale",
    price: p.price,
    sources: src,
  };
}

describe("artistAppearances", () => {
  describe("role categorization", () => {
    it("headliner of a concert goes to ownTour", () => {
      const events = [
        ev({ id: "e1", acts: [{ name: "Bonobo", role: "headliner" }] }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour.map((e) => e.id)).toEqual(["e1"]);
      expect(result.guest).toEqual([]);
      expect(result.festival).toEqual([]);
    });

    it("support role goes to guest", () => {
      const events = [
        ev({
          id: "e1",
          acts: [
            { name: "Headliner", role: "headliner" },
            { name: "Bonobo", role: "support" },
          ],
        }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour).toEqual([]);
      expect(result.guest.map((e) => e.id)).toEqual(["e1"]);
      expect(result.festival).toEqual([]);
    });

    it("any role in festival kind goes to festival", () => {
      const events = [
        ev({
          id: "e1",
          kind: "festival",
          acts: [{ name: "Bonobo", role: "lineup" }],
        }),
        ev({
          id: "e2",
          kind: "festival",
          acts: [{ name: "Bonobo", role: "headliner" }],
        }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour).toEqual([]);
      expect(result.guest).toEqual([]);
      expect(result.festival.map((e) => e.id)).toEqual(["e1", "e2"]);
    });

    it("festival headliner goes to festival, not ownTour", () => {
      const events = [
        ev({
          id: "e1",
          kind: "festival",
          acts: [{ name: "Bonobo", role: "headliner" }],
        }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour).toEqual([]);
      expect(result.festival.map((e) => e.id)).toEqual(["e1"]);
    });
  });

  describe("name matching", () => {
    it("name match ignores case", () => {
      const events = [
        ev({ id: "e1", acts: [{ name: "BONOBO", role: "headliner" }] }),
      ];
      const result = artistAppearances(events, "bonobo");
      expect(result.ownTour.map((e) => e.id)).toEqual(["e1"]);
    });

    it("name match ignores accents", () => {
      const events = [
        ev({ id: "e1", acts: [{ name: "Sigur Rós", role: "headliner" }] }),
      ];
      const result = artistAppearances(events, "sigur ros");
      expect(result.ownTour.map((e) => e.id)).toEqual(["e1"]);
    });

    it("does not match if artist not in lineup", () => {
      const events = [
        ev({ id: "e1", acts: [{ name: "Other", role: "headliner" }] }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour).toEqual([]);
      expect(result.guest).toEqual([]);
      expect(result.festival).toEqual([]);
    });
  });

  describe("sorting", () => {
    it("ownTour sorted by startsAt ascending", () => {
      const events = [
        ev({ id: "e3", startsAt: "2026-12-15T20:00:00Z", acts: [{ name: "Bonobo", role: "headliner" }] }),
        ev({ id: "e1", startsAt: "2026-10-15T20:00:00Z", acts: [{ name: "Bonobo", role: "headliner" }] }),
        ev({ id: "e2", startsAt: "2026-11-15T20:00:00Z", acts: [{ name: "Bonobo", role: "headliner" }] }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    });

    it("guest sorted by startsAt ascending", () => {
      const events = [
        ev({
          id: "e3",
          startsAt: "2026-12-15T20:00:00Z",
          acts: [
            { name: "Headliner", role: "headliner" },
            { name: "Bonobo", role: "support" },
          ],
        }),
        ev({
          id: "e1",
          startsAt: "2026-10-15T20:00:00Z",
          acts: [
            { name: "Headliner", role: "headliner" },
            { name: "Bonobo", role: "support" },
          ],
        }),
        ev({
          id: "e2",
          startsAt: "2026-11-15T20:00:00Z",
          acts: [
            { name: "Headliner", role: "headliner" },
            { name: "Bonobo", role: "support" },
          ],
        }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.guest.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    });

    it("festival sorted by startsAt ascending", () => {
      const events = [
        ev({
          id: "e3",
          startsAt: "2026-12-15T20:00:00Z",
          kind: "festival",
          acts: [{ name: "Bonobo", role: "lineup" }],
        }),
        ev({
          id: "e1",
          startsAt: "2026-10-15T20:00:00Z",
          kind: "festival",
          acts: [{ name: "Bonobo", role: "lineup" }],
        }),
        ev({
          id: "e2",
          startsAt: "2026-11-15T20:00:00Z",
          kind: "festival",
          acts: [{ name: "Bonobo", role: "lineup" }],
        }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.festival.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    });
  });

  describe("edge cases", () => {
    it("empty events list returns empty appearances", () => {
      const result = artistAppearances([], "Bonobo");
      expect(result.ownTour).toEqual([]);
      expect(result.guest).toEqual([]);
      expect(result.festival).toEqual([]);
    });

    it("events without the artist are ignored", () => {
      const events = [
        ev({ id: "e1", acts: [{ name: "Other", role: "headliner" }] }),
      ];
      const result = artistAppearances(events, "Bonobo");
      expect(result.ownTour).toEqual([]);
    });
  });
});

describe("artistHistory", () => {
  describe("top artist in profile", () => {
    it("returns top with plays and rank (1-based)", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("Bonobo", ["electronic"]), plays: 812, weight: 1 },
          { artist: artist("Tycho", ["ambient"]), plays: 300, weight: 0.5 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Bonobo");
      expect(result.top).toEqual({ plays: 812, rank: 1 });
    });

    it("rank is 1-based index", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("Bonobo"), plays: 812, weight: 1 },
          { artist: artist("Tycho"), plays: 300, weight: 0.5 },
          { artist: artist("Moderat"), plays: 200, weight: 0.4 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Tycho");
      expect(result.top?.rank).toBe(2);
    });

    it("returns genres from top artist", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("Bonobo", ["electronic", "ambient"]), plays: 812, weight: 1 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Bonobo");
      expect(result.genres).toEqual(["electronic", "ambient"]);
    });
  });

  describe("dormant artist in profile", () => {
    it("returns dormant with period and plays", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [
          {
            artist: artist("Moderat", ["electronic"]),
            lastHeavyPeriod: "2023",
            plays: 200,
          },
        ],
      };
      const result = artistHistory(profile, "Moderat");
      expect(result.dormant).toEqual({ period: "2023", plays: 200 });
    });

    it("returns genres from dormant artist if no top artist", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [
          {
            artist: artist("Moderat", ["electronic", "techno"]),
            lastHeavyPeriod: "2023",
            plays: 200,
          },
        ],
      };
      const result = artistHistory(profile, "Moderat");
      expect(result.genres).toEqual(["electronic", "techno"]);
    });
  });

  describe("similar artist in profile", () => {
    it("returns similarTo with via and match", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [],
        topTags: [],
        adjacentArtists: [
          {
            artist: artist("Emancipator"),
            via: "Bonobo",
            match: 0.9,
          },
        ],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Emancipator");
      expect(result.similarTo).toEqual([{ via: "Bonobo", match: 0.9 }]);
    });

    it("multiple similar artists return all", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [],
        topTags: [],
        adjacentArtists: [
          { artist: artist("Emancipator"), via: "Bonobo", match: 0.9 },
          { artist: artist("Emancipator"), via: "Tycho", match: 0.85 },
        ],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Emancipator");
      expect(result.similarTo).toEqual([
        { via: "Bonobo", match: 0.9 },
        { via: "Tycho", match: 0.85 },
      ]);
    });

    it("returns genres from first similar artist if no top/dormant", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [],
        topTags: [],
        adjacentArtists: [
          {
            artist: artist("Emancipator", ["electronic", "downtempo"]),
            via: "Bonobo",
            match: 0.9,
          },
        ],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Emancipator");
      expect(result.genres).toEqual(["electronic", "downtempo"]);
    });
  });

  describe("name matching", () => {
    it("name match ignores case", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("BONOBO", ["electronic"]), plays: 812, weight: 1 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "bonobo");
      expect(result.top?.plays).toBe(812);
    });

    it("name match ignores accents", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("Sigur Rós", ["post-rock"]), plays: 500, weight: 0.8 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "sigur ros");
      expect(result.top?.plays).toBe(500);
    });
  });

  describe("unknown artist", () => {
    it("unknown artist returns no top/dormant/similarTo and empty genres", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("Bonobo", ["electronic"]), plays: 812, weight: 1 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [],
      };
      const result = artistHistory(profile, "Unknown");
      expect(result.top).toBeUndefined();
      expect(result.dormant).toBeUndefined();
      expect(result.similarTo).toBeUndefined();
      expect(result.genres).toEqual([]);
    });
  });

  describe("priority of genres", () => {
    it("top artist genres take priority over dormant", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [
          { artist: artist("Bonobo", ["electronic"]), plays: 812, weight: 1 },
        ],
        topTags: [],
        adjacentArtists: [],
        adjacentTags: [],
        dormantArtists: [
          {
            artist: artist("Bonobo", ["rock"]),
            lastHeavyPeriod: "2020",
            plays: 50,
          },
        ],
      };
      const result = artistHistory(profile, "Bonobo");
      expect(result.genres).toEqual(["electronic"]);
    });

    it("dormant genres take priority over similar", () => {
      const profile: TasteProfile = {
        username: "test",
        builtAt: "",
        topArtists: [],
        topTags: [],
        adjacentArtists: [
          {
            artist: artist("Emancipator", ["downtempo"]),
            via: "Bonobo",
            match: 0.9,
          },
        ],
        adjacentTags: [],
        dormantArtists: [
          {
            artist: artist("Moderat", ["techno"]),
            lastHeavyPeriod: "2023",
            plays: 200,
          },
        ],
      };
      const result = artistHistory(profile, "Moderat");
      expect(result.genres).toEqual(["techno"]);
    });
  });
});
