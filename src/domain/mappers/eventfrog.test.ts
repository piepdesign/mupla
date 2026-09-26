import { describe, expect, it } from "vitest";
import { genresFromRubrics, localized, mapEventfrogEvent, musicRubricIds, parseLocations, parseRubrics, rubricPath, type EfRubric } from "./eventfrog";

const rubrics = parseRubrics({
  rubrics: [
    { id: 1, parentId: 0, title: { de: "Konzerte", en: "Concerts" } },
    { id: 11, parentId: 1, title: { de: "Rock / Pop" } },
    { id: 2, parentId: 0, title: { en: "Party" } },
    { id: 21, parentId: 2, title: { de: "Techno & House" } },
    { id: 3, parentId: 0, title: { de: "Festivals" } },
    { id: 4, parentId: 0, title: { de: "Theater" } },
    { id: 41, parentId: 4, title: { de: "Komödie" } },
    { id: 5, parentId: 0, title: { de: "Musicals & Shows" } },
    { id: 51, parentId: 5, title: { de: "Musical" } },
    { id: 22, parentId: 2, title: { de: "Kinderparty" } },
    { id: 6, parentId: 0, title: { de: "Kurse / Seminare" } },
    { id: 61, parentId: 6, title: { de: "Musik / Tanz" } },
    { id: 23, parentId: 2, title: { de: "Sonstige Partys" } },
    { id: 13, parentId: 1, title: { de: "Weitere Musikrichtungen" } },
  ],
  totalNumberOfResources: 7,
});
const rubricMap = new Map<number, EfRubric>(rubrics.map((r) => [r.id, r]));
const locations = new Map(
  parseLocations({
    locations: [
      { id: "900", title: { de: "Kulturhalle" }, city: "Gießen", country: "DE", lat: 50.58, lng: 8.67, url: "https://eventfrog.ch/l/900" },
      { id: "901", title: { de: "Salzhaus" }, city: "Winterthur", country: "CH", lat: 47.5, lng: 8.72 },
      { id: "902", title: { de: "Club" }, city: "London", country: "GB", lat: 51.5, lng: -0.12 },
    ],
  }).map((l) => [l.id, l]),
);
const FETCHED = "2026-09-26T12:00:00.000Z";

function raw(extra: Record<string, unknown> = {}) {
  return {
    id: "1234567890123456789",
    title: { en: "Morning Grey", de: "Morgengrau" },
    url: "https://eventfrog.ch/de/p/1",
    begin: "2026-10-15T19:00:00+02:00",
    end: "2026-10-15T23:00:00+02:00",
    rubricId: 11,
    locationIds: ["900"],
    cancelled: false,
    soldOut: false,
    agendaEntryOnly: false,
    visible: true,
    published: true,
    lowestTicketPrice: 25.5,
    presaleLink: "https://tickets.eventfrog.ch/1",
    ...extra,
  };
}
const map = (extra: Record<string, unknown> = {}) => mapEventfrogEvent(raw(extra), locations, rubricMap, FETCHED);

describe("localized", () => {
  it("prefers German, then English, then any language", () => {
    expect(localized({ en: "A", de: "B" })).toBe("B");
    expect(localized({ en: "A", fr: "C" })).toBe("A");
    expect(localized({ fr: "C" })).toBe("C");
    expect(localized({})).toBeUndefined();
  });
});

describe("rubrics", () => {
  it("builds the path from leaf to root", () => {
    expect(rubricPath(11, rubricMap)).toEqual(["Rock / Pop", "Konzerte"]);
  });
  it("selects music rubrics including their children, not theatre, musicals, kids or courses", () => {
    expect(musicRubricIds(rubrics).sort()).toEqual([1, 11, 13, 2, 21, 23, 3].sort());
  });
  it("splits rubric titles into genres and drops generic words", () => {
    expect(genresFromRubrics(["Rock / Pop", "Konzerte"])).toEqual(["rock", "pop"]);
    expect(genresFromRubrics(["Techno & House", "Party"])).toEqual(["techno", "house"]);
    expect(genresFromRubrics(["Festivals"])).toEqual([]);
    expect(genresFromRubrics(["Sonstige Partys", "Party"])).toEqual([]);
    expect(genresFromRubrics(["Weitere Musikrichtungen", "Konzerte"])).toEqual([]);
    expect(genresFromRubrics(["Jazz / Blues", "Konzerte"])).toEqual(["jazz", "blues"]);
  });
});

describe("mapEventfrogEvent", () => {
  it("maps a concert with venue, price in EUR and the title as headliner", () => {
    const e = map()!;
    expect(e.id).toBe("ef:1234567890123456789");
    expect(e.title).toBe("Morgengrau");
    expect(e.kind).toBe("concert");
    expect(e.startsAt).toBe("2026-10-15T17:00:00.000Z");
    expect(e.venue).toMatchObject({ id: "ef:900", name: "Kulturhalle", city: "Gießen", country: "DE", lat: 50.58, lon: 8.67 });
    expect(e.price).toEqual({ min: 25.5, currency: "EUR" });
    expect(e.lineup).toHaveLength(1);
    expect(e.lineup[0]).toMatchObject({ role: "headliner", artist: { name: "Morgengrau", genres: ["rock", "pop"] } });
    expect(e.genres).toEqual(["rock", "pop"]);
    expect(e.status).toBe("onsale");
    expect(e.officialTicketUrl).toBe("https://tickets.eventfrog.ch/1");
    expect(e.imageUrl).toBeUndefined();
    expect(e.sources[0]).toMatchObject({ provider: "eventfrog", externalId: "event:1234567890123456789" });
  });

  it("uses CHF in Switzerland and drops the price where the currency is unknown", () => {
    expect(map({ locationIds: ["901"] })!.price).toEqual({ min: 25.5, currency: "CHF" });
    expect(map({ locationIds: ["902"] })!.price).toBeUndefined();
    expect(map({ lowestTicketPrice: 0 })!.price).toBeUndefined();
  });

  it("marks festivals and parties without inventing a line-up", () => {
    const fest = map({ rubricId: 3, title: { de: "Seewiese Open Air" } })!;
    expect(fest.kind).toBe("festival");
    expect(fest.size).toBe("festival");
    expect(fest.lineup).toEqual([]);
    const party = map({ rubricId: 21, title: { de: "Nachtschicht" } })!;
    expect(party.kind).toBe("club-night");
    expect(party.lineup).toEqual([]);
    expect(party.genres).toEqual(["techno", "house"]);
  });

  it("counts multi-day events in calendar days", () => {
    const e = map({ rubricId: 3, begin: "2027-06-18T14:00:00+02:00", end: "2027-06-20T23:00:00+02:00" })!;
    expect(e.durationDays).toBe(3);
  });

  it("maps cancelled, sold out and agenda-only entries", () => {
    expect(map({ cancelled: true })!.status).toBe("cancelled");
    expect(map({ soldOut: true })!.status).toBe("soldout");
    const agenda = map({ agendaEntryOnly: true, presaleLink: undefined })!;
    expect(agenda.status).toBe("unknown");
    expect(agenda.officialTicketUrl).toBe("https://eventfrog.ch/de/p/1");
  });

  it("serves images through the local image route and keeps the credit", () => {
    const e = map({ emblemToShow: { url: "https://cdn.eventfrog.net/img/1.jpg", width: 800, height: 600 }, emblemCredits: "Foto: Jane Doe" })!;
    expect(e.imageUrl).toBe("/api/image?src=https%3A%2F%2Fcdn.eventfrog.net%2Fimg%2F1.jpg");
    expect(e.imageCredit).toBe("Foto: Jane Doe");
    expect(map({ emblemToShow: { url: "https://example.com/1.jpg" } })!.imageUrl).toBeUndefined();
    expect(map({ emblemToShow: null })!.imageUrl).toBeUndefined();
  });

  it("uses the location alias as venue name", () => {
    expect(map({ locationAlias: { de: "Hauptbühne" } })!.venue.name).toBe("Hauptbühne");
  });

  it("skips streaming events, hidden events and records without date", () => {
    expect(map({ locationIds: [] })).toBeNull();
    expect(map({ locationIds: ["999"] })).toBeNull();
    expect(map({ visible: false })).toBeNull();
    expect(map({ published: false })).toBeNull();
    expect(map({ begin: "kein Datum" })).toBeNull();
    expect(map({ title: {} })).toBeNull();
  });

  it("does not count a night past midnight as a second day", () => {
    expect(map({ begin: "2026-10-15T22:00:00+02:00", end: "2026-10-16T05:00:00+02:00" })!.durationDays).toBe(1);
    expect(map({ rubricId: 3, begin: "2027-06-18T14:00:00+02:00", end: "2027-06-20T03:00:00+02:00" })!.durationDays).toBe(2);
  });

  it("ignores an end before the start", () => {
    const e = map({ end: "2026-10-14T10:00:00+02:00" })!;
    expect(e.endsAt).toBeUndefined();
    expect(e.durationDays).toBe(1);
  });
});
