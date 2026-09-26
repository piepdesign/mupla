import { describe, expect, it } from "vitest";
import type { MusicEvent, Recommendation } from "./types";
import { crossCheck } from "./crosscheck";
import type { EventMatch } from "./scoring";

const src = [{ provider: "ticketmaster", externalId: "x", url: "", fetchedAt: "" }];
const event = {
  id: "e", kind: "concert", title: "Bonobo", startsAt: "2026-11-01T19:00:00Z", startTimeKnown: true,
  venue: { id: "v", name: "Halle", city: "Frankfurt", country: "DE", sources: src }, lineup: [], genres: [], size: "hall", status: "onsale", sources: src,
} satisfies MusicEvent;
const components = { profileMatch: 1, reachability: 1, timing: 1, discovery: 0, priceFriction: 0 };
const match: EventMatch = { direct: [{ name: "Bonobo", plays: 812, weight: 1, headliner: true }], similar: [], dormant: [], genres: [], adjacentGenres: [] };

describe("crossCheck", () => {
  it("passes a consistent recommendation", () => {
    const rec: Recommendation = { event, components, score: 0.85, reasons: [{ type: "direct-artist", artist: "Bonobo", plays: 812 }] };
    expect(crossCheck(rec, match).every((c) => c.ok)).toBe(true);
  });
  it("catches a wrong play count, a wrong sum and an unbacked genre", () => {
    const rec: Recommendation = {
      event, components, score: 0.9,
      reasons: [{ type: "direct-artist", artist: "Bonobo", plays: 900 }, { type: "genre-match", tag: "polka" }],
    };
    const failed = crossCheck(rec, match).filter((c) => !c.ok).map((c) => c.label);
    expect(failed).toHaveLength(3);
  });
  it("flags a discovery bonus without a discovery reason", () => {
    const rec: Recommendation = { event, components: { ...components, discovery: 0.5 }, score: 0.925, reasons: [{ type: "direct-artist", artist: "Bonobo", plays: 812 }] };
    expect(crossCheck(rec, match).find((c) => c.label.startsWith("Entdeckungsbonus"))?.ok).toBe(false);
  });
});
