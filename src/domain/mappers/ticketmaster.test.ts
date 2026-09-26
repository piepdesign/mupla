import { describe, it, expect } from "vitest";
import { mapTicketmasterEvent } from "./ticketmaster";

type Obj = Record<string, unknown>;

function createRawEvent(overrides?: Partial<Obj>): Obj {
  return {
    id: "G123",
    name: "Test Concert",
    url: "https://www.ticketmaster.de/test-concert",
    dates: {
      start: {
        localDate: "2026-11-14",
        localTime: "20:00:00",
        dateTime: "2026-11-14T20:00:00",
        timeTBA: false,
        noSpecificTime: false,
      },
      end: {
        localDate: "2026-11-14",
      },
      timezone: "Europe/Berlin",
      status: {
        code: "onsale",
      },
    },
    sales: {
      public: {
        startDateTime: "2026-11-01T00:00:00.000Z",
      },
      presales: [],
    },
    priceRanges: [
      {
        type: "standard",
        currency: "EUR",
        min: 25,
        max: 50,
      },
    ],
    classifications: [
      {
        segment: { name: "Music" },
        genre: { name: "Dance/Electronic" },
        subGenre: { name: "Undefined" },
      },
    ],
    images: [
      {
        ratio: "16_9",
        url: "https://example.com/image.jpg",
        width: 1920,
        height: 1080,
        fallback: false,
      },
    ],
    _embedded: {
      venues: [
        {
          id: "V123",
          name: "Test Venue",
          city: { name: "Frankfurt" },
          country: { countryCode: "DE" },
          location: { latitude: "50.11", longitude: "8.68" },
          timezone: "Europe/Berlin",
        },
      ],
      attractions: [
        {
          id: "A123",
          name: "Test Band",
          url: "https://www.ticketmaster.de/test-band",
          classifications: [
            {
              genre: { name: "Dance/Electronic" },
              subGenre: { name: "Electronic" },
            },
          ],
          images: [
            {
              url: "https://example.com/band.jpg",
              width: 500,
              fallback: false,
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe("mapTicketmasterEvent", () => {
  it("maps id with 'tm:' prefix", () => {
    const raw = createRawEvent();
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.id).toBe("tm:G123");
  });

  it("returns null when id is missing", () => {
    const raw = createRawEvent({ id: undefined });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result).toBeNull();
  });

  it("returns null when name is missing", () => {
    const raw = createRawEvent({ name: undefined });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result).toBeNull();
  });

  it("returns null when localDate is missing", () => {
    const raw = createRawEvent({
      dates: {
        start: { localTime: "20:00:00" },
        timezone: "Europe/Berlin",
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result).toBeNull();
  });

  it("sets startTimeKnown true when dateTime is present", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-11-14",
          dateTime: "2026-11-14T20:00:00",
          timeTBA: false,
          noSpecificTime: false,
        },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.startTimeKnown).toBe(true);
  });

  it("sets startTimeKnown false when localTime is missing", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-11-14",
          timeTBA: false,
          noSpecificTime: false,
        },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.startTimeKnown).toBe(false);
  });

  it("sets startTimeKnown false when timeTBA is true", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-11-14",
          timeTBA: true,
        },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.startTimeKnown).toBe(false);
  });

  it("computes startsAt from dateTime", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-11-14",
          dateTime: "2026-11-14T20:00:00.000Z",
          timeTBA: false,
          noSpecificTime: false,
        },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.startsAt).toBe("2026-11-14T20:00:00.000Z");
  });

  it("computes startsAt from localDate and localTime", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-07-01",
          localTime: "20:00:00",
          timeTBA: false,
          noSpecificTime: false,
        },
        timezone: "Europe/Berlin",
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.startsAt).toBe("2026-07-01T18:00:00.000Z");
  });

  it("parses venue lat/lon from strings to numbers", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.venue.lat).toBe(50.11);
    expect(result?.venue.lon).toBe(8.68);
  });

  it("sets venue lat/lon to undefined for '0','0' coordinates", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "0", longitude: "0" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.venue.lat).toBeUndefined();
    expect(result?.venue.lon).toBeUndefined();
  });

  it("normalizes country code", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "de" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.venue.country).toBe("DE");
  });

  it("normalizes genres", () => {
    const raw = createRawEvent({
      classifications: [
        {
          segment: { name: "Music" },
          genre: { name: "Dance/Electronic" },
          subGenre: { name: "Electronic" },
        },
      ],
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.genres).toContain("electronic");
  });

  it("drops 'Undefined' genre", () => {
    const raw = createRawEvent({
      classifications: [
        {
          segment: { name: "Music" },
          genre: { name: "Dance/Electronic" },
          subGenre: { name: "Undefined" },
        },
      ],
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.genres).not.toContain("undefined");
  });

  it("maps price min/max/currency", () => {
    const raw = createRawEvent({
      priceRanges: [
        {
          type: "standard",
          currency: "EUR",
          min: 25,
          max: 50,
        },
      ],
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.price?.min).toBe(25);
    expect(result?.price?.max).toBe(50);
    expect(result?.price?.currency).toBe("EUR");
  });

  it("sets price to undefined when no priceRanges", () => {
    const raw = createRawEvent({ priceRanges: undefined });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.price).toBeUndefined();
  });

  it("first lineup entry has 'headliner' role for concerts", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [
          {
            id: "A123",
            name: "Headliner Band",
            classifications: [],
            images: [],
          },
        ],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.lineup[0]?.role).toBe("headliner");
  });

  it("all lineup entries have 'lineup' role for festivals", () => {
    const raw = createRawEvent({
      name: "Test Festival 2026",
      dates: {
        start: { localDate: "2026-07-01" },
        end: { localDate: "2026-07-03" },
        status: { code: "onsale" },
      },
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [
          { id: "A1", name: "Band 1", classifications: [], images: [] },
          { id: "A2", name: "Band 2", classifications: [], images: [] },
          { id: "A3", name: "Band 3", classifications: [], images: [] },
          { id: "A4", name: "Band 4", classifications: [], images: [] },
        ],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.kind).toBe("festival");
    expect(result?.lineup[0]?.role).toBe("lineup");
    expect(result?.lineup[1]?.role).toBe("lineup");
  });

  it("detects festival from 'Festival' in title", () => {
    const raw = createRawEvent({
      name: "Test Festival 2026",
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.kind).toBe("festival");
  });

  it("detects festival from multi-day with many artists", () => {
    const raw = createRawEvent({
      dates: {
        start: { localDate: "2026-07-01" },
        end: { localDate: "2026-07-03" },
        status: { code: "onsale" },
      },
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [
          { id: "A1", name: "Band 1", classifications: [], images: [] },
          { id: "A2", name: "Band 2", classifications: [], images: [] },
          { id: "A3", name: "Band 3", classifications: [], images: [] },
          { id: "A4", name: "Band 4", classifications: [], images: [] },
        ],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.kind).toBe("festival");
    expect(result?.size).toBe("festival");
  });

  it("sets status to 'onsale'", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-11-14",
          dateTime: "2026-11-14T20:00:00",
        },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.status).toBe("onsale");
  });

  it("sets status to 'presale' when offsale but presale active", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    const raw = createRawEvent({
      sales: {
        public: {
          startDateTime: "2026-11-10T00:00:00.000Z",
        },
        presales: [
          {
            startDateTime: "2026-11-01T00:00:00.000Z",
            endDateTime: "2026-11-08T23:59:59.000Z",
          },
        ],
      },
      dates: {
        start: {
          localDate: "2026-11-14",
          dateTime: "2026-11-14T20:00:00",
        },
        status: { code: "offsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z", now);
    expect(result?.status).toBe("presale");
  });

  it("sets officialTicketUrl to url field", () => {
    const raw = createRawEvent({
      url: "https://www.ticketmaster.de/test-concert",
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.officialTicketUrl).toBe("https://www.ticketmaster.de/test-concert");
  });

  it("sets sources[0].provider to 'ticketmaster'", () => {
    const raw = createRawEvent();
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.sources[0]?.provider).toBe("ticketmaster");
  });

  it("sets durationDays from start and end dates", () => {
    const raw = createRawEvent({
      dates: {
        start: { localDate: "2026-07-01" },
        end: { localDate: "2026-07-03" },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.durationDays).toBe(3);
  });

  it("defaults durationDays to 1 when no end date", () => {
    const raw = createRawEvent({
      dates: {
        start: { localDate: "2026-11-14" },
        status: { code: "onsale" },
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.durationDays).toBe(1);
  });

  it("picks 16_9 aspect ratio image first", () => {
    const raw = createRawEvent({
      images: [
        {
          ratio: "4_3",
          url: "https://example.com/4_3.jpg",
          width: 1024,
          fallback: false,
        },
        {
          ratio: "16_9",
          url: "https://example.com/16_9.jpg",
          width: 1920,
          fallback: false,
        },
      ],
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.imageUrl).toBe("https://example.com/16_9.jpg");
  });

  it("picks highest resolution when multiple 16_9", () => {
    const raw = createRawEvent({
      images: [
        {
          ratio: "16_9",
          url: "https://example.com/small.jpg",
          width: 1024,
          fallback: false,
        },
        {
          ratio: "16_9",
          url: "https://example.com/large.jpg",
          width: 1920,
          fallback: false,
        },
      ],
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.imageUrl).toBe("https://example.com/large.jpg");
  });

  it("excludes fallback images", () => {
    const raw = createRawEvent({
      images: [
        {
          ratio: "16_9",
          url: "https://example.com/fallback.jpg",
          width: 1920,
          fallback: true,
        },
        {
          ratio: "4_3",
          url: "https://example.com/real.jpg",
          width: 1024,
          fallback: false,
        },
      ],
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.imageUrl).toBe("https://example.com/real.jpg");
  });

  it("sets announcedAt from public sales startDateTime", () => {
    const raw = createRawEvent({
      sales: {
        public: {
          startDateTime: "2026-11-01T10:00:00.000Z",
        },
        presales: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.announcedAt).toBe("2026-11-01T10:00:00.000Z");
  });

  it("sets announcedAt to undefined when no public sales date", () => {
    const raw = createRawEvent({
      sales: {
        public: {},
        presales: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.announcedAt).toBeUndefined();
  });

  it("handles missing venues in _embedded gracefully", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [],
        attractions: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.venue.id).toBe("tm:unknown");
    expect(result?.venue.name).toBe("");
  });

  it("handles missing _embedded gracefully", () => {
    const raw = createRawEvent({
      _embedded: undefined,
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.venue.id).toBe("tm:unknown");
    expect(result?.lineup).toEqual([]);
  });

  it("uses venue timezone if dates timezone missing", () => {
    const raw = createRawEvent({
      dates: {
        start: {
          localDate: "2026-07-01",
          localTime: "20:00:00",
        },
        end: { localDate: "2026-07-01" },
        status: { code: "onsale" },
      },
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "London Venue",
            city: { name: "London" },
            country: { countryCode: "GB" },
            location: { latitude: "51.5", longitude: "-0.1" },
            timezone: "Europe/London",
          },
        ],
        attractions: [],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.startsAt).toBe("2026-07-01T19:00:00.000Z");
  });

  it("includes artist imageUrl from attractions", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [
          {
            id: "A123",
            name: "Test Band",
            classifications: [],
            images: [
              {
                url: "https://example.com/band.jpg",
                width: 500,
                fallback: false,
              },
            ],
          },
        ],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.lineup[0]?.artist.imageUrl).toBe("https://example.com/band.jpg");
  });

  it("generates id for attractions without explicit id", () => {
    const raw = createRawEvent({
      _embedded: {
        venues: [
          {
            id: "V123",
            name: "Test Venue",
            city: { name: "Frankfurt" },
            country: { countryCode: "DE" },
            location: { latitude: "50.11", longitude: "8.68" },
            timezone: "Europe/Berlin",
          },
        ],
        attractions: [
          {
            name: "Test Band",
            classifications: [],
            images: [],
          },
        ],
      },
    });
    const result = mapTicketmasterEvent(raw, "2026-09-26T00:00:00.000Z");
    expect(result?.lineup[0]?.artist.id).toMatch(/tm:/);
  });
});
