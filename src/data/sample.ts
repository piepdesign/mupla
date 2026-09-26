import type { Artist, Recommendation, Venue } from "@/domain/types";
import { totalScore } from "@/domain/scoring";

/**
 * Sample data for the design foundation (stage 1). Fictional artists and venues,
 * so nothing here can be mistaken for a real event.
 */

const src = (id: string) => [{ provider: "sample", externalId: id, url: "https://example.org", fetchedAt: "2026-09-26T12:00:00Z" }];

const artist = (id: string, name: string, genres: string[]): Artist => ({ id, name, genres, sources: src(id) });
const venue = (id: string, name: string, city: string, lat: number, lon: number, capacity?: number): Venue => ({
  id, name, city, country: "DE", lat, lon, capacity, sources: src(id),
});

const halle = venue("v1", "Beispielhalle", "Frankfurt am Main", 50.11, 8.68, 5000);
const club = venue("v2", "Club Muster", "Gießen", 50.58, 8.67, 400);
const wiese = venue("v3", "Festivalwiese Nord", "Kassel", 51.31, 9.48);

const raw: Recommendation[] = [
  {
    event: {
      id: "e1", kind: "tour-date", title: "Nachtfalter Orchester", startTimeKnown: true, startsAt: "2026-11-14T20:00:00+01:00",
      venue: halle, lineup: [{ artist: artist("a1", "Nachtfalter Orchester", ["downtempo", "electronic"]), role: "headliner" }],
      genres: ["downtempo", "electronic", "jazz"], price: { min: 39, max: 58, currency: "EUR" },
      size: "hall", status: "onsale", officialTicketUrl: "https://example.org/tickets/e1",
      imageUrl: undefined, sources: src("e1"),
    },
    score: 0, distanceKm: 53,
    components: { profileMatch: 1, reachability: 0.93, timing: 0.95, discovery: 0, priceFriction: 0 },
    reasons: [{ type: "direct-artist", artist: "Nachtfalter Orchester", plays: 412 }],
  },
  {
    event: {
      id: "e2", kind: "concert", title: "Kiesel & Kobalt", startTimeKnown: true, startsAt: "2026-10-09T21:00:00+02:00",
      venue: club, lineup: [{ artist: artist("a2", "Kiesel & Kobalt", ["indietronica"]), role: "headliner" }],
      genres: ["indietronica", "dream pop"], price: undefined,
      size: "club", sizeEstimated: false, status: "presale", officialTicketUrl: "https://example.org/tickets/e2",
      sources: src("e2"),
    },
    score: 0, distanceKm: 1.4,
    components: { profileMatch: 0.62, reachability: 1, timing: 0.7, discovery: 0, priceFriction: 0 },
    reasons: [{ type: "similar-artist", artist: "Kiesel & Kobalt", via: "Nachtfalter Orchester" }],
  },
  {
    event: {
      id: "e3", kind: "festival", title: "Weitwinkel Festival", startTimeKnown: true, startsAt: "2027-06-18T14:00:00+02:00",
      endsAt: "2027-06-20T23:00:00+02:00", durationDays: 3, venue: wiese,
      lineup: [
        { artist: artist("a3", "Lumen Delta", ["ambient"]), role: "lineup" },
        { artist: artist("a4", "Nachtfalter Orchester", ["downtempo"]), role: "lineup" },
        { artist: artist("a5", "Seegras", ["post-rock"]), role: "lineup" },
      ],
      genres: ["electronic", "ambient", "post-rock"], price: { min: 119, currency: "EUR", estimated: true },
      size: "festival", status: "onsale", officialTicketUrl: "https://example.org/tickets/e3",
      firstEditionYear: 2026, sources: src("e3"),
    },
    score: 0, distanceKm: 141,
    components: { profileMatch: 0.8, reachability: 0.55, timing: 0.4, discovery: 0, priceFriction: 0.1 },
    reasons: [{ type: "lineup-match", count: 3, examples: ["Nachtfalter Orchester", "Lumen Delta"] }],
  },
  {
    event: {
      id: "e4", kind: "concert", title: "Orbit Chor", startTimeKnown: true, startsAt: "2026-12-02T19:30:00+01:00",
      venue: halle, lineup: [{ artist: artist("a6", "Orbit Chor", ["neoclassical"]), role: "headliner" }],
      genres: ["neoclassical", "modern classical"], price: { min: 25, max: 25, currency: "EUR" },
      size: "hall", sizeEstimated: true, status: "soldout", officialTicketUrl: "https://example.org/tickets/e4",
      sources: src("e4"),
    },
    score: 0, distanceKm: 53,
    components: { profileMatch: 0.35, reachability: 0.93, timing: 0.9, discovery: 0.4, priceFriction: 0 },
    reasons: [{ type: "adjacent-genre", tag: "neoclassical", via: "ambient", source: "lastfm", artist: "Orbit Chor" }],
  },
  {
    event: {
      id: "e5", kind: "tour-date", title: "Die Fernen Freunde", startTimeKnown: true, startsAt: "2027-02-20T20:00:00+01:00",
      venue: halle, lineup: [{ artist: artist("a7", "Die Fernen Freunde", ["indie rock"]), role: "headliner" }],
      genres: ["indie rock"], price: { min: 45, max: 72, currency: "EUR" },
      size: "hall", status: "onsale", officialTicketUrl: "https://example.org/tickets/e5",
      sources: src("e5"),
    },
    score: 0, distanceKm: 53,
    components: { profileMatch: 0.5, reachability: 0.93, timing: 0.6, discovery: 0, priceFriction: 0 },
    reasons: [{ type: "dormant-artist", artist: "Die Fernen Freunde", period: "2024" }],
  },
];

/** Scores are computed with the real formula, so the sample never shows a number the logic would not produce. */
export const sampleRecommendations: Recommendation[] = raw.map((r) => ({ ...r, score: totalScore(r.components) }));
