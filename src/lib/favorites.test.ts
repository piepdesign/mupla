import { describe, expect, it } from "vitest";
import { emptyFavorites, eventFavoriteKind, parseFavorites } from "./favorites";

describe("favourites format", () => {
  it("accepts version 1 and drops non-strings", () => {
    const f = parseFavorites({ version: 1, artists: ["A", 3], genres: ["jazz"], events: [], festivals: ["F"], lastSeenAt: "2026-09-01T00:00:00Z" });
    expect(f).toEqual({ version: 1, artists: ["A"], genres: ["jazz"], events: [], festivals: ["F"], lastSeenAt: "2026-09-01T00:00:00Z" });
  });
  it("rejects unknown versions and garbage instead of guessing", () => {
    expect(parseFavorites({ version: 2, artists: [] })).toBeNull();
    expect(parseFavorites("x")).toBeNull();
    expect(parseFavorites(null)).toBeNull();
  });
  it("falls back to epoch for an invalid lastSeenAt, which the profile page treats as first visit", () => {
    expect(parseFavorites({ version: 1, lastSeenAt: "gestern" })!.lastSeenAt).toBe(new Date(0).toISOString());
    expect(emptyFavorites().lastSeenAt).toBe(new Date(0).toISOString());
  });
  it("stores festivals apart from single events", () => {
    expect(eventFavoriteKind({ kind: "festival" })).toBe("festivals");
    expect(eventFavoriteKind({ kind: "concert" })).toBe("events");
  });
});
