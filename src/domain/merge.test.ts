import { describe, it, expect } from "vitest";
import type { MusicEvent, Artist, Venue, SourceRef, Provider } from "./types";
import { isSameEvent, mergePair, dedupe, headlinerName } from "./merge";

function createArtist(overrides?: Partial<Artist>): Artist {
  return {
    id: "test-artist-1",
    name: "Test Artist",
    genres: [],
    sources: [createSourceRef("curated")],
    ...overrides,
  };
}

function createVenue(overrides?: Partial<Venue>): Venue {
  return {
    id: "test-venue-1",
    name: "Test Venue",
    city: "Frankfurt",
    country: "DE",
    sources: [createSourceRef("curated")],
    ...overrides,
  };
}

function createSourceRef(provider: Provider): SourceRef {
  return {
    provider,
    externalId: `test-${provider}`,
    url: "https://example.com",
    fetchedAt: "2026-09-26T00:00:00.000Z",
  };
}

function createEvent(overrides?: Partial<MusicEvent>): MusicEvent {
  const artist = createArtist();
  const venue = createVenue();
  return {
    id: "test-event-1",
    kind: "concert",
    title: "Test Concert",
    startsAt: "2026-11-14T19:00:00.000Z",
    startTimeKnown: true,
    venue,
    lineup: [{ artist, role: "headliner" }],
    genres: [],
    size: "hall",
    status: "onsale",
    sources: [createSourceRef("curated")],
    ...overrides,
  };
}

describe("headlinerName", () => {
  it("returns name of artist with 'headliner' role", () => {
    const artist = createArtist({ name: "Bonobo" });
    const event = createEvent({
      lineup: [
        { artist: createArtist({ name: "Support Band" }), role: "support" },
        { artist, role: "headliner" },
      ],
    });
    expect(headlinerName(event)).toBe("Bonobo");
  });

  it("falls back to first lineup entry when no headliner", () => {
    const artist = createArtist({ name: "Test Band" });
    const event = createEvent({ lineup: [{ artist, role: "support" }] });
    expect(headlinerName(event)).toBe("Test Band");
  });

  it("falls back to title when lineup is empty", () => {
    const event = createEvent({ title: "Mystery Concert", lineup: [] });
    expect(headlinerName(event)).toBe("Mystery Concert");
  });
});

describe("isSameEvent", () => {
  it("returns false for events from same provider", () => {
    const tmVenue = createVenue();
    const event1 = createEvent({
      id: "tm-1",
      title: "Bonobo",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: tmVenue,
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      id: "tm-2",
      title: "Bonobo Night 2",
      startsAt: "2026-11-15T19:00:00.000Z",
      venue: tmVenue,
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    expect(isSameEvent(event1, event2)).toBe(false);
  });

  it("returns true for same day, city, and headliner similarity", () => {
    const event1 = createEvent({
      title: "The National",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "The National" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      title: "National",
      startsAt: "2026-11-14T21:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "National" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(true);
  });

  it("normalizes city names for comparison", () => {
    const event1 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt am Main" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(true);
  });

  it("normalizes artist names for headliner comparison", () => {
    const event1 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "BONOBO" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(true);
  });

  it("returns true for one day apart", () => {
    const event1 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      startsAt: "2026-11-15T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(true);
  });

  it("returns false for two days apart", () => {
    const event1 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      startsAt: "2026-11-16T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(false);
  });

  it("returns false for different cities", () => {
    const event1 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Berlin" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(false);
  });

  it("returns false for different headliners", () => {
    const event1 = createEvent({
      title: "Bonobo Live",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      title: "Moderat Live",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [{ artist: createArtist({ name: "Moderat" }), role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    expect(isSameEvent(event1, event2)).toBe(false);
  });

  it("compares title when headliners not available", () => {
    const event1 = createEvent({
      title: "Summer Festival 2026",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      title: "Summer Festival",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue: createVenue({ city: "Frankfurt" }),
      lineup: [],
      sources: [createSourceRef("curated")],
    });
    // Should compare titles with similarity
    expect(isSameEvent(event1, event2)).toBe(true);
  });
});

describe("mergePair", () => {
  it("winner is record with more depth", () => {
    const shallow = createEvent({
      id: "shallow",
      title: "Event",
      startTimeKnown: false,
      lineup: [],
      genres: [],
      sources: [createSourceRef("curated")],
    });
    const deep = createEvent({
      id: "deep",
      title: "Better Event",
      startTimeKnown: true,
      endsAt: "2026-11-14T22:00:00.000Z",
      officialTicketUrl: "https://tickets.com",
      lineup: [{ artist: createArtist({ name: "Bonobo" }), role: "headliner" }],
      genres: ["electronic"],
      sources: [createSourceRef("ticketmaster")],
    });
    const result = mergePair(shallow, deep);
    expect(result.title).toBe("Better Event");
    expect(result.id).toBe("deep");
  });

  it("missing price is filled from other source", () => {
    const withoutPrice = createEvent({
      price: undefined,
      sources: [createSourceRef("curated")],
    });
    const withPrice = createEvent({
      price: { min: 25, max: 50, currency: "EUR" },
      sources: [createSourceRef("ticketmaster")],
    });
    const result = mergePair(withoutPrice, withPrice);
    expect(result.price?.min).toBe(25);
    expect(result.price?.max).toBe(50);
  });

  it("missing image is filled from other source", () => {
    const withoutImage = createEvent({
      imageUrl: undefined,
      sources: [createSourceRef("curated")],
    });
    const withImage = createEvent({
      imageUrl: "https://example.com/image.jpg",
      sources: [createSourceRef("ticketmaster")],
    });
    const result = mergePair(withoutImage, withImage);
    expect(result.imageUrl).toBe("https://example.com/image.jpg");
  });

  it("missing coordinates are filled from other source", () => {
    const withoutCoords = createEvent({
      venue: createVenue({ lat: undefined, lon: undefined }),
      sources: [createSourceRef("curated")],
    });
    const withCoords = createEvent({
      venue: createVenue({ lat: 50.1109, lon: 8.6821 }),
      sources: [createSourceRef("ticketmaster")],
    });
    const result = mergePair(withoutCoords, withCoords);
    expect(result.venue.lat).toBe(50.1109);
    expect(result.venue.lon).toBe(8.6821);
  });

  it("sources contain both", () => {
    const event1 = createEvent({
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      sources: [createSourceRef("curated")],
    });
    const result = mergePair(event1, event2);
    expect(result.sources.length).toBe(2);
    expect(result.sources.some((s) => s.provider === "ticketmaster")).toBe(true);
    expect(result.sources.some((s) => s.provider === "curated")).toBe(true);
  });

  it("lineup keeps winner acts and adds acts only other has", () => {
    const artist1 = createArtist({ name: "Bonobo" });
    const artist2 = createArtist({ name: "Support Band" });
    const artist3 = createArtist({ name: "Another Band" });
    const event1 = createEvent({
      lineup: [
        { artist: artist1, role: "headliner" },
        { artist: artist2, role: "support" },
      ],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      lineup: [
        { artist: artist1, role: "headliner" },
        { artist: artist3, role: "support" },
      ],
      sources: [createSourceRef("curated")],
    });
    // Make event1 deeper so it wins
    const result = mergePair(
      { ...event1, startTimeKnown: true, endsAt: "2026-11-14T22:00:00.000Z" },
      event2
    );
    expect(result.lineup.length).toBe(3);
    expect(result.lineup.some((l) => l.artist.name === "Bonobo")).toBe(true);
    expect(result.lineup.some((l) => l.artist.name === "Support Band")).toBe(true);
    expect(result.lineup.some((l) => l.artist.name === "Another Band")).toBe(true);
  });

  it("genres union without duplicates", () => {
    const event1 = createEvent({
      genres: ["electronic", "dance"],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      genres: ["electronic", "ambient"],
      sources: [createSourceRef("curated")],
    });
    const result = mergePair(event1, event2);
    expect(result.genres).toContain("electronic");
    expect(result.genres).toContain("dance");
    expect(result.genres).toContain("ambient");
    expect(result.genres.length).toBe(3);
  });
});

describe("dedupe", () => {
  it("reduces 3 events to 2 when 2 are duplicates", () => {
    const venue = createVenue();
    const bonoboArtist = createArtist({ name: "Bonobo" });
    const moderatArtist = createArtist({ name: "Moderat" });
    const tmBonobo = createEvent({
      id: "tm-bonobo",
      title: "Bonobo",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue,
      lineup: [{ artist: bonoboArtist, role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const curatedBonobo = createEvent({
      id: "curated-bonobo",
      title: "Bonobo",
      startsAt: "2026-11-14T21:00:00.000Z",
      venue,
      lineup: [{ artist: bonoboArtist, role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    const tmModerat = createEvent({
      id: "tm-moderat",
      title: "Moderat",
      startsAt: "2026-11-15T19:00:00.000Z",
      venue: createVenue({ city: "Cologne" }),
      lineup: [{ artist: moderatArtist, role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const result = dedupe([tmBonobo, curatedBonobo, tmModerat]);
    expect(result.length).toBe(2);
  });

  it("result is sorted by startsAt ascending", () => {
    const event1 = createEvent({
      id: "1",
      startsAt: "2026-11-20T19:00:00.000Z",
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      id: "2",
      startsAt: "2026-11-15T19:00:00.000Z",
      sources: [createSourceRef("curated")],
    });
    const result = dedupe([event1, event2]);
    expect(result[0].id).toBe("2");
    expect(result[1].id).toBe("1");
  });

  it("merged event has both sources", () => {
    const venue = createVenue();
    const bonoboArtist = createArtist({ name: "Bonobo" });
    const event1 = createEvent({
      id: "tm-1",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue,
      lineup: [{ artist: bonoboArtist, role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const event2 = createEvent({
      id: "curated-1",
      startsAt: "2026-11-14T21:00:00.000Z",
      venue,
      lineup: [{ artist: bonoboArtist, role: "headliner" }],
      sources: [createSourceRef("curated")],
    });
    const result = dedupe([event1, event2]);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(2);
  });

  it("running dedupe twice on same input gives same result", () => {
    const venue = createVenue();
    const bonoboArtist = createArtist({ name: "Bonobo" });
    const events: MusicEvent[] = [
      createEvent({
        id: "tm-1",
        startsAt: "2026-11-14T19:00:00.000Z",
        venue,
        lineup: [{ artist: bonoboArtist, role: "headliner" }],
        sources: [createSourceRef("ticketmaster")],
      }),
      createEvent({
        id: "curated-1",
        startsAt: "2026-11-14T21:00:00.000Z",
        venue,
        lineup: [{ artist: bonoboArtist, role: "headliner" }],
        sources: [createSourceRef("curated")],
      }),
    ];
    const result1 = dedupe(events);
    const result2 = dedupe(result1);
    expect(result2.length).toBe(result1.length);
  });

  it("two-night run from same provider stays as 2 events", () => {
    const venue = createVenue();
    const bonoboArtist = createArtist({ name: "Bonobo" });
    const night1 = createEvent({
      id: "tm-night1",
      startsAt: "2026-11-14T19:00:00.000Z",
      venue,
      lineup: [{ artist: bonoboArtist, role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const night2 = createEvent({
      id: "tm-night2",
      startsAt: "2026-11-15T19:00:00.000Z",
      venue,
      lineup: [{ artist: bonoboArtist, role: "headliner" }],
      sources: [createSourceRef("ticketmaster")],
    });
    const result = dedupe([night1, night2]);
    expect(result.length).toBe(2);
  });
});
