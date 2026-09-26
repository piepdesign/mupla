import { describe, expect, it } from "vitest";
import type { MusicEvent, Recommendation } from "./types";
import {
  DEFAULT_FILTERS,
  applyFilters,
  matchesQuery,
  parseFilters,
  serializeFilters,
  type Filters,
} from "./filters";

const src = [{ provider: "ticketmaster", externalId: "x", url: "", fetchedAt: "" }];
const artist = (name: string, genres: string[] = []) => ({
  id: name,
  name,
  genres,
  sources: src,
});

function ev(p: Partial<MusicEvent> & { acts?: string[] }): MusicEvent {
  return {
    id: p.id ?? "e",
    kind: p.kind ?? "concert",
    title: p.title ?? (p.acts?.[0] ?? "X"),
    startsAt: p.startsAt ?? "2026-10-15T20:00:00+02:00",
    startTimeKnown: p.startTimeKnown ?? true,
    endsAt: p.endsAt,
    venue: p.venue ?? {
      id: "v",
      name: "Halle",
      city: "Frankfurt",
      country: "DE",
      lat: 50.11,
      lon: 8.68,
      sources: src,
    },
    lineup: (p.acts ?? []).map((n, i) => ({
      artist: artist(n),
      role: i === 0 ? "headliner" : "support",
    })),
    genres: p.genres ?? [],
    size: p.size ?? "hall",
    status: p.status ?? "onsale",
    price: p.price,
    sources: src,
  };
}

describe("parseFilters", () => {
  it("empty URLSearchParams equals DEFAULT_FILTERS", () => {
    const result = parseFilters(new URLSearchParams(""));
    expect(result).toEqual(DEFAULT_FILTERS);
    expect(result.radiusKm).toBe(150);
    expect(result.discovery).toBe(30);
    expect(result.showUnknownPrice).toBe(true);
    expect(result.countries).toEqual([]);
    expect(result.sizes).toEqual([]);
    expect(result.weekdays).toEqual([]);
    expect(result.genres).toEqual([]);
    expect(result.q).toBe("");
  });

  it("invalid countries are dropped: land=deu,DE gives [DE]", () => {
    const result = parseFilters(new URLSearchParams("land=deu,DE"));
    expect(result.countries).toEqual(["DE"]);
  });

  it("invalid sizes are dropped: groesse=club,huge gives [club]", () => {
    const result = parseFilters(new URLSearchParams("groesse=club,huge"));
    expect(result.sizes).toEqual(["club"]);
  });

  it("invalid weekdays are dropped: tage=1,9,x gives [1]", () => {
    const result = parseFilters(new URLSearchParams("tage=1,9,x"));
    expect(result.weekdays).toEqual([1]);
  });

  it("invalid date format gives undefined: von=2026-13 gives undefined", () => {
    const result = parseFilters(new URLSearchParams("von=2026-13"));
    expect(result.from).toBeUndefined();
  });

  it("negative km falls back to DEFAULT: km=-5 gives 150", () => {
    const result = parseFilters(new URLSearchParams("km=-5"));
    expect(result.radiusKm).toBe(150);
  });

  it("entdeckung clamps to 100: entdeckung=250 gives 100", () => {
    const result = parseFilters(new URLSearchParams("entdeckung=250"));
    expect(result.discovery).toBe(100);
  });

  it("valid date format is parsed: von=2026-10-15", () => {
    const result = parseFilters(new URLSearchParams("von=2026-10-15"));
    expect(result.from).toBe("2026-10-15");
  });

  it("km=0 is accepted (no limit)", () => {
    const result = parseFilters(new URLSearchParams("km=0"));
    expect(result.radiusKm).toBe(0);
  });

  it("priceMin and priceMax are parsed", () => {
    const result = parseFilters(new URLSearchParams("preis_min=20&preis_max=80"));
    expect(result.priceMin).toBe(20);
    expect(result.priceMax).toBe(80);
  });

  it("preis_unbekannt=0 sets showUnknownPrice to false", () => {
    const result = parseFilters(new URLSearchParams("preis_unbekannt=0"));
    expect(result.showUnknownPrice).toBe(false);
  });

  it("genre parameter is lowercased", () => {
    const result = parseFilters(new URLSearchParams("genre=Electronic,Rock"));
    expect(result.genres).toEqual(["electronic", "rock"]);
  });

  it("query is trimmed", () => {
    const result = parseFilters(new URLSearchParams("q=  Bonobo  "));
    expect(result.q).toBe("Bonobo");
  });
});

describe("serializeFilters", () => {
  it("DEFAULT_FILTERS serializes to empty string", () => {
    const result = serializeFilters(DEFAULT_FILTERS);
    expect(result.toString()).toBe("");
  });

  it("non-default radiusKm is included", () => {
    const f = { ...DEFAULT_FILTERS, radiusKm: 250 };
    const result = serializeFilters(f);
    expect(result.get("km")).toBe("250");
  });

  it("non-default discovery is included", () => {
    const f = { ...DEFAULT_FILTERS, discovery: 50 };
    const result = serializeFilters(f);
    expect(result.get("entdeckung")).toBe("50");
  });

  it("showUnknownPrice=false is included", () => {
    const f = { ...DEFAULT_FILTERS, showUnknownPrice: false };
    const result = serializeFilters(f);
    expect(result.get("preis_unbekannt")).toBe("0");
  });

  it("countries are joined with comma", () => {
    const f = { ...DEFAULT_FILTERS, countries: ["DE", "AT", "CH"] };
    const result = serializeFilters(f);
    expect(result.get("land")).toBe("DE,AT,CH");
  });

  it("sizes are joined with comma", () => {
    const f = { ...DEFAULT_FILTERS, sizes: ["club", "hall"] } as Filters;
    const result = serializeFilters(f);
    expect(result.get("groesse")).toBe("club,hall");
  });

  it("weekdays are joined with comma", () => {
    const f = { ...DEFAULT_FILTERS, weekdays: [0, 5, 6] };
    const result = serializeFilters(f);
    expect(result.get("tage")).toBe("0,5,6");
  });

  it("genres are joined with comma", () => {
    const f = { ...DEFAULT_FILTERS, genres: ["electronic", "ambient"] };
    const result = serializeFilters(f);
    expect(result.get("genre")).toBe("electronic,ambient");
  });

  it("priceMin and priceMax are included", () => {
    const f = { ...DEFAULT_FILTERS, priceMin: 20, priceMax: 80 };
    const result = serializeFilters(f);
    expect(result.get("preis_min")).toBe("20");
    expect(result.get("preis_max")).toBe("80");
  });

  it("from and to dates are included", () => {
    const f = { ...DEFAULT_FILTERS, from: "2026-10-01", to: "2026-12-31" };
    const result = serializeFilters(f);
    expect(result.get("von")).toBe("2026-10-01");
    expect(result.get("bis")).toBe("2026-12-31");
  });

  it("query is included", () => {
    const f = { ...DEFAULT_FILTERS, q: "Bonobo" };
    const result = serializeFilters(f);
    expect(result.get("q")).toBe("Bonobo");
  });
});

describe("round-trip serialization", () => {
  it("parseFilters(serializeFilters(f)) deep-equals f", () => {
    const f1 = {
      ...DEFAULT_FILTERS,
      countries: ["DE", "AT"],
      radiusKm: 250,
      priceMin: 20,
      priceMax: 100,
      showUnknownPrice: false,
      sizes: ["club", "hall"] as const,
      from: "2026-10-01",
      to: "2026-12-31",
      weekdays: [0, 5, 6],
      genres: ["electronic", "ambient"],
      discovery: 60,
      q: "Bonobo",
    } as Filters;
    const f2 = {
      ...DEFAULT_FILTERS,
      radiusKm: 0,
      discovery: 0,
      q: "test",
    } as Filters;
    const filters = [DEFAULT_FILTERS, f1, f2];

    for (const f of filters) {
      const serialized = serializeFilters(f);
      const parsed = parseFilters(serialized);
      expect(parsed).toEqual(f);
    }
  });
});

describe("matchesQuery", () => {
  it("empty query matches anything", () => {
    const rec: Pick<Recommendation, "event"> = { event: ev({ acts: ["Bonobo"] }) };
    expect(matchesQuery(rec, "")).toBe(true);
  });

  it("matches artist name case-insensitively", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({ acts: ["Bonobo"] }),
    };
    expect(matchesQuery(rec, "bonobo")).toBe(true);
    expect(matchesQuery(rec, "BONOBO")).toBe(true);
  });

  it("matches artist name accent-insensitively", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({ acts: ["Sigur Rós"] }),
    };
    expect(matchesQuery(rec, "sigur ros")).toBe(true);
  });

  it("matches venue name", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({
        venue: {
          id: "v",
          name: "Café Nord",
          city: "Frankfurt",
          country: "DE",
          lat: 50.1,
          lon: 8.6,
          sources: src,
        },
      }),
    };
    expect(matchesQuery(rec, "cafe")).toBe(true);
    expect(matchesQuery(rec, "Café")).toBe(true);
  });

  it("matches city", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({
        venue: {
          id: "v",
          name: "Halle",
          city: "Mainz",
          country: "DE",
          lat: 50.1,
          lon: 8.6,
          sources: src,
        },
      }),
    };
    expect(matchesQuery(rec, "mainz")).toBe(true);
  });

  it("matches title", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({ title: "Festival XYZ" }),
    };
    expect(matchesQuery(rec, "festival")).toBe(true);
  });

  it("matches genres", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({ genres: ["electronic", "ambient"] }),
    };
    expect(matchesQuery(rec, "electronic")).toBe(true);
  });

  it("does not match if query not found", () => {
    const rec: Pick<Recommendation, "event"> = {
      event: ev({ acts: ["Bonobo"] }),
    };
    expect(matchesQuery(rec, "polka")).toBe(false);
  });
});

describe("applyFilters", () => {
  const makeRec = (e: MusicEvent, distanceKm?: number): Pick<Recommendation, "event" | "distanceKm"> => ({
    event: e,
    distanceKm,
  });

  describe("radius filtering", () => {
    it("radiusKm > 0 excludes items farther than radiusKm", () => {
      const items = [
        makeRec(ev({ id: "near" }), 50),
        makeRec(ev({ id: "far" }), 200),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        radiusKm: 150,
      });
      expect(result.map((r) => r.event.id)).toEqual(["near"]);
    });

    it("radiusKm > 0 excludes items with undefined distance", () => {
      const items = [
        makeRec(ev({ id: "with-distance" }), 50),
        makeRec(ev({ id: "no-distance" }), undefined),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        radiusKm: 150,
      });
      expect(result.map((r) => r.event.id)).toEqual(["with-distance"]);
    });

    it("radiusKm = 0 keeps all items regardless of distance", () => {
      const items = [
        makeRec(ev({ id: "near" }), 50),
        makeRec(ev({ id: "far" }), 500),
        makeRec(ev({ id: "no-distance" }), undefined),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        radiusKm: 0,
      });
      expect(result.length).toBe(3);
    });
  });

  describe("country filtering", () => {
    it("empty countries list matches all", () => {
      const items = [
        makeRec(
          ev({
            id: "de",
            venue: { id: "v", name: "Halle", city: "Frankfurt", country: "DE", lat: 50.1, lon: 8.6, sources: src },
          }),
          50
        ),
        makeRec(
          ev({
            id: "at",
            venue: { id: "v", name: "Halle", city: "Vienna", country: "AT", lat: 48.2, lon: 16.4, sources: src },
          }),
          100
        ),
      ];
      const result = applyFilters(items, { ...DEFAULT_FILTERS, countries: [] });
      expect(result.length).toBe(2);
    });

    it("countries filter excludes non-matching", () => {
      const items = [
        makeRec(
          ev({
            id: "de",
            venue: { id: "v", name: "Halle", city: "Frankfurt", country: "DE", lat: 50.1, lon: 8.6, sources: src },
          }),
          50
        ),
        makeRec(
          ev({
            id: "at",
            venue: { id: "v", name: "Halle", city: "Vienna", country: "AT", lat: 48.2, lon: 16.4, sources: src },
          }),
          200
        ),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        countries: ["DE"],
      });
      expect(result.map((r) => r.event.id)).toEqual(["de"]);
    });
  });

  describe("price filtering", () => {
    it("showUnknownPrice false drops events without price", () => {
      const items = [
        makeRec(ev({ id: "with-price", price: { min: 30, max: 60, currency: "EUR" } }), 50),
        makeRec(ev({ id: "no-price" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        showUnknownPrice: false,
      });
      expect(result.map((r) => r.event.id)).toEqual(["with-price"]);
    });

    it("showUnknownPrice true keeps events without price", () => {
      const items = [
        makeRec(ev({ id: "with-price", price: { min: 30, currency: "EUR" } }), 50),
        makeRec(ev({ id: "no-price" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        showUnknownPrice: true,
      });
      expect(result.length).toBe(2);
    });

    it("priceMin drops events whose max price (or min if no max) is below priceMin", () => {
      const items = [
        makeRec(ev({ id: "cheap", price: { min: 10, max: 20, currency: "EUR" } }), 50),
        makeRec(ev({ id: "expensive", price: { min: 50, max: 100, currency: "EUR" } }), 50),
        makeRec(ev({ id: "only-min", price: { min: 15, currency: "EUR" } }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        priceMin: 30,
      });
      expect(result.map((r) => r.event.id)).toEqual(["expensive"]);
    });

    it("priceMax does not drop anything (soft constraint)", () => {
      const items = [
        makeRec(ev({ id: "cheap", price: { min: 10, currency: "EUR" } }), 50),
        makeRec(ev({ id: "expensive", price: { min: 100, currency: "EUR" } }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        priceMax: 50,
      });
      expect(result.length).toBe(2);
    });
  });

  describe("size filtering", () => {
    it("empty sizes list matches all", () => {
      const items = [
        makeRec(ev({ id: "club", size: "club" }), 50),
        makeRec(ev({ id: "arena", size: "arena" }), 50),
      ];
      const result = applyFilters(items, { ...DEFAULT_FILTERS, sizes: [] });
      expect(result.length).toBe(2);
    });

    it("sizes filter includes only matching", () => {
      const items = [
        makeRec(ev({ id: "club", size: "club" }), 50),
        makeRec(ev({ id: "hall", size: "hall" }), 50),
        makeRec(ev({ id: "arena", size: "arena" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        sizes: ["club", "hall"],
      });
      expect(result.map((r) => r.event.id)).toEqual(["club", "hall"]);
    });
  });

  describe("weekday filtering", () => {
    it("empty weekdays list matches all", () => {
      const items = [
        makeRec(ev({ id: "friday", startsAt: "2026-10-16T20:00:00Z" }), 50), // Friday in UTC, Friday in Berlin
        makeRec(ev({ id: "sunday", startsAt: "2026-10-18T20:00:00Z" }), 50), // Sunday in UTC, Sunday in Berlin
      ];
      const result = applyFilters(items, { ...DEFAULT_FILTERS, weekdays: [] });
      expect(result.length).toBe(2);
    });

    it("uses Europe/Berlin local day: 2026-10-03T23:30:00Z is Sunday", () => {
      // 2026-10-03T23:30:00Z is October 4, 01:30 in Berlin (UTC+2), which is Sunday
      const items = [
        makeRec(ev({ id: "sun", startsAt: "2026-10-03T23:30:00Z" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        weekdays: [0], // Sunday
      });
      expect(result.map((r) => r.event.id)).toEqual(["sun"]);
    });

    it("weekdays [6] excludes Sunday", () => {
      const items = [
        makeRec(ev({ id: "sun", startsAt: "2026-10-03T23:30:00Z" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        weekdays: [6], // Saturday
      });
      expect(result.length).toBe(0);
    });
  });

  describe("date range filtering", () => {
    it("from excludes events ending before from date", () => {
      const items = [
        makeRec(ev({ id: "before", startsAt: "2026-09-15T20:00:00Z" }), 50),
        makeRec(ev({ id: "after", startsAt: "2026-10-15T20:00:00Z" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        from: "2026-10-01",
      });
      expect(result.map((r) => r.event.id)).toEqual(["after"]);
    });

    it("to excludes events starting after to date", () => {
      const items = [
        makeRec(ev({ id: "before", startsAt: "2026-10-15T20:00:00Z" }), 50),
        makeRec(ev({ id: "after", startsAt: "2026-11-15T20:00:00Z" }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        to: "2026-10-31",
      });
      expect(result.map((r) => r.event.id)).toEqual(["before"]);
    });

    it("multi-day event with endsAt after from is kept even if startsAt is before", () => {
      const items = [
        makeRec(
          ev({
            id: "multiday",
            startsAt: "2026-09-28T20:00:00Z",
            endsAt: "2026-10-02T23:00:00Z",
          }),
          50
        ),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        from: "2026-10-01",
      });
      expect(result.map((r) => r.event.id)).toEqual(["multiday"]);
    });
  });

  describe("genre filtering", () => {
    it("empty genres list matches all", () => {
      const items = [
        makeRec(ev({ id: "e1", genres: ["electronic"] }), 50),
        makeRec(ev({ id: "e2", genres: ["rock"] }), 50),
      ];
      const result = applyFilters(items, { ...DEFAULT_FILTERS, genres: [] });
      expect(result.length).toBe(2);
    });

    it("matches event genres", () => {
      const items = [
        makeRec(
          ev({
            id: "electronic",
            genres: ["electronic", "ambient"],
          }),
          50
        ),
        makeRec(ev({ id: "rock", genres: ["rock"] }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        genres: ["electronic"],
      });
      expect(result.map((r) => r.event.id)).toEqual(["electronic"]);
    });

    it("matches lineup artist genres", () => {
      const items = [
        makeRec(
          ev({
            id: "bonobo",
            acts: ["Bonobo"],
          }),
          50
        ),
      ];
      // Need to manually add genres to the artist since our ev() helper doesn't
      items[0].event.lineup[0].artist.genres = ["electronic", "ambient"];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        genres: ["electronic"],
      });
      expect(result.map((r) => r.event.id)).toEqual(["bonobo"]);
    });
  });

  describe("query filtering", () => {
    it("empty query matches all", () => {
      const items = [
        makeRec(ev({ id: "e1", acts: ["Bonobo"] }), 50),
        makeRec(ev({ id: "e2", acts: ["Unknown"] }), 50),
      ];
      const result = applyFilters(items, { ...DEFAULT_FILTERS, q: "" });
      expect(result.length).toBe(2);
    });

    it("query matches artist name", () => {
      const items = [
        makeRec(ev({ id: "e1", acts: ["Bonobo"] }), 50),
        makeRec(ev({ id: "e2", acts: ["Unknown"] }), 50),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        q: "bonobo",
      });
      expect(result.map((r) => r.event.id)).toEqual(["e1"]);
    });

    it("query matches venue name case-insensitively", () => {
      const items = [
        makeRec(
          ev({
            id: "nordcafe",
            venue: {
              id: "v",
              name: "Café Nord",
              city: "Frankfurt",
              country: "DE",
              lat: 50.1,
              lon: 8.6,
              sources: src,
            },
          }),
          50
        ),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        q: "cafe",
      });
      expect(result.map((r) => r.event.id)).toEqual(["nordcafe"]);
    });
  });

  describe("combined filters", () => {
    it("combines multiple filters correctly", () => {
      const items = [
        makeRec(
          ev({
            id: "match",
            acts: ["Bonobo"],
            size: "club",
            venue: {
              id: "v",
              name: "Club",
              city: "Frankfurt",
              country: "DE",
              lat: 50.1,
              lon: 8.6,
              sources: src,
            },
            price: { min: 20, max: 40, currency: "EUR" },
          }),
          50
        ),
        makeRec(
          ev({
            id: "wrong-size",
            acts: ["Bonobo"],
            size: "arena",
            venue: {
              id: "v",
              name: "Club",
              city: "Frankfurt",
              country: "DE",
              lat: 50.1,
              lon: 8.6,
              sources: src,
            },
          }),
          50
        ),
        makeRec(
          ev({
            id: "wrong-country",
            acts: ["Bonobo"],
            size: "club",
            venue: {
              id: "v",
              name: "Club",
              city: "Vienna",
              country: "AT",
              lat: 48.2,
              lon: 16.4,
              sources: src,
            },
          }),
          50
        ),
      ];
      const result = applyFilters(items, {
        ...DEFAULT_FILTERS,
        countries: ["DE"],
        sizes: ["club"],
        radiusKm: 100,
        q: "bonobo",
      });
      expect(result.map((r) => r.event.id)).toEqual(["match"]);
    });
  });
});
