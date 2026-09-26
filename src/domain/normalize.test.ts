import { describe, it, expect } from "vitest";
import {
  normalizeName,
  nameSimilarity,
  normalizeCity,
  normalizeCountry,
  normalizeCurrency,
  normalizeGenre,
  normalizeGenres,
  zonedToUtcIso,
  daysInclusive,
  mapTicketmasterStatus,
  estimateSize,
} from "./normalize";

describe("normalizeName", () => {
  it("strips accents", () => {
    expect(normalizeName("Sigur Rós")).toBe("sigur ros");
  });

  it("converts & to 'and'", () => {
    expect(normalizeName("R&B")).toBe("r and b");
  });

  it("removes leading articles", () => {
    expect(normalizeName("The National")).toBe("national");
    expect(normalizeName("Die Ärzte")).toBe("arzte");
    expect(normalizeName("Der Plan")).toBe("plan");
    expect(normalizeName("Les Misérables")).toBe("miserables");
    expect(normalizeName("Los Lobos")).toBe("lobos");
  });

  it("collapses punctuation to spaces", () => {
    expect(normalizeName("AC/DC")).toBe("ac dc");
    expect(normalizeName("Joy.Division")).toBe("joy division");
  });

  it("lowercases output", () => {
    expect(normalizeName("ABBA")).toBe("abba");
  });

  it("combines all transformations", () => {
    expect(normalizeName("The Kooks & Friends")).toBe("kooks and friends");
  });

  it("handles multiple spaces", () => {
    expect(normalizeName("  Artist  Name  ")).toBe("artist name");
  });
});

describe("nameSimilarity", () => {
  it("returns 1 for identical normalized names", () => {
    expect(nameSimilarity("The National", "national")).toBe(1);
  });

  it("returns 1 for exactly same string", () => {
    expect(nameSimilarity("National", "National")).toBe(1);
  });

  it("returns 0 for clearly different names", () => {
    const sim = nameSimilarity("Bonobo", "Moderat");
    expect(sim).toBeLessThan(0.5);
  });

  it("handles small typo with high similarity", () => {
    const sim = nameSimilarity("Bonobo", "Bonobbo");
    expect(sim).toBeGreaterThanOrEqual(0.85);
  });

  it("returns 0 when one name is empty after normalization", () => {
    expect(nameSimilarity("", "test")).toBe(0);
    expect(nameSimilarity("test", "")).toBe(0);
  });

  it("returns 0 for names with less than 2 characters after removing spaces", () => {
    expect(nameSimilarity("a", "b")).toBe(0);
  });

  it("uses dice coefficient on character bigrams", () => {
    const simAB = nameSimilarity("abc", "abc");
    const simAD = nameSimilarity("abc", "def");
    expect(simAB).toBeGreaterThan(simAD);
  });
});

describe("normalizeCity", () => {
  it("removes German city suffixes", () => {
    expect(normalizeCity("Frankfurt am Main")).toBe("frankfurt");
    expect(normalizeCity("Frankfurt am main")).toBe("frankfurt");
  });

  it("maps city aliases correctly", () => {
    expect(normalizeCity("Köln")).toBe("koln");
    expect(normalizeCity("Cologne")).toBe("koln");
    expect(normalizeCity("München")).toBe("munchen");
    expect(normalizeCity("Munich")).toBe("munchen");
    expect(normalizeCity("Vienna")).toBe("wien");
  });

  it("handles normalized form already in aliases", () => {
    expect(normalizeCity("frankfurt")).toBe("frankfurt");
  });

  it("normalizes name first, then applies aliases", () => {
    expect(normalizeCity("KÖLN")).toBe("koln");
  });

  it("returns normalized city when not in aliases", () => {
    const result = normalizeCity("SomeCity");
    expect(typeof result).toBe("string");
  });
});

describe("normalizeCountry", () => {
  it("converts to uppercase", () => {
    expect(normalizeCountry("de")).toBe("DE");
  });

  it("maps country aliases", () => {
    expect(normalizeCountry("UK")).toBe("GB");
    expect(normalizeCountry("EL")).toBe("GR");
  });

  it("returns undefined for three-letter codes", () => {
    expect(normalizeCountry("DEU")).toBeUndefined();
  });

  it("returns undefined for invalid codes", () => {
    expect(normalizeCountry("invalid")).toBeUndefined();
  });

  it("returns undefined when passed undefined", () => {
    expect(normalizeCountry(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(normalizeCountry("")).toBeUndefined();
  });

  it("accepts valid ISO-3166-1 alpha-2 codes", () => {
    expect(normalizeCountry("FR")).toBe("FR");
    expect(normalizeCountry("IT")).toBe("IT");
  });

  it("trims whitespace", () => {
    expect(normalizeCountry("  de  ")).toBe("DE");
  });
});

describe("normalizeCurrency", () => {
  it("converts to uppercase", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
  });

  it("returns undefined for non-3-letter codes", () => {
    expect(normalizeCurrency("€")).toBeUndefined();
    expect(normalizeCurrency("E")).toBeUndefined();
  });

  it("returns undefined when passed undefined", () => {
    expect(normalizeCurrency(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(normalizeCurrency("")).toBeUndefined();
  });

  it("accepts valid ISO-4217 codes", () => {
    expect(normalizeCurrency("USD")).toBe("USD");
    expect(normalizeCurrency("GBP")).toBe("GBP");
  });

  it("trims whitespace", () => {
    expect(normalizeCurrency("  eur  ")).toBe("EUR");
  });
});

describe("normalizeGenre", () => {
  it("drops 'Undefined'", () => {
    expect(normalizeGenre("Undefined")).toBeUndefined();
  });

  it("converts to lowercase", () => {
    expect(normalizeGenre("ROCK")).toBe("rock");
  });

  it("uses aliases from table", () => {
    expect(normalizeGenre("Hip-Hop/Rap")).toBe("hip-hop");
    expect(normalizeGenre("R&B")).toBe("rnb");
  });

  it("returns undefined for blocklisted terms", () => {
    expect(normalizeGenre("other")).toBeUndefined();
    expect(normalizeGenre("music")).toBeUndefined();
    expect(normalizeGenre("")).toBeUndefined();
  });

  it("normalizes spaces in raw input", () => {
    const result = normalizeGenre("hip   hop");
    expect(typeof result).toBe("string");
  });

  it("returns genre when not in aliases or blocklist", () => {
    expect(normalizeGenre("rock")).toBe("rock");
  });
});

describe("normalizeGenres", () => {
  it("drops 'Undefined' and 'other' genres", () => {
    const result = normalizeGenres(["Undefined", "Rock", "Other"]);
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("other");
    expect(result).toContain("rock");
  });

  it("applies aliases", () => {
    const result = normalizeGenres(["Hip-Hop/Rap", "R&B"]);
    expect(result).toContain("hip-hop");
    expect(result).toContain("rnb");
  });

  it("removes duplicates", () => {
    const result = normalizeGenres(["Rock", "rock", "ROCK"]);
    expect(result).toEqual(["rock"]);
  });

  it("preserves order", () => {
    const result = normalizeGenres(["Jazz", "Rock", "Pop"]);
    expect(result[0]).toBe("jazz");
    expect(result[1]).toBe("rock");
    expect(result[2]).toBe("pop");
  });

  it("handles empty array", () => {
    const result: string[] = normalizeGenres([]);
    expect(result).toEqual([]);
  });

  it("skips undefined entries", () => {
    const result = normalizeGenres(["Rock", undefined, "Jazz"]);
    expect(result).toContain("rock");
    expect(result).toContain("jazz");
    expect(result).toHaveLength(2);
  });
});

describe("zonedToUtcIso", () => {
  it("converts Berlin summer time to UTC (UTC+2)", () => {
    const result = zonedToUtcIso("2026-07-01", "20:00:00", "Europe/Berlin");
    expect(result).toBe("2026-07-01T18:00:00.000Z");
  });

  it("converts Berlin winter time to UTC (UTC+1)", () => {
    const result = zonedToUtcIso("2026-12-01", "20:00:00", "Europe/Berlin");
    expect(result).toBe("2026-12-01T19:00:00.000Z");
  });

  it("handles DST change day correctly", () => {
    const result = zonedToUtcIso("2026-03-29", "12:00:00", "Europe/Berlin");
    expect(result).toBe("2026-03-29T10:00:00.000Z");
  });

  it("handles London timezone", () => {
    const result = zonedToUtcIso("2026-07-01", "20:00:00", "Europe/London");
    expect(result).toBe("2026-07-01T19:00:00.000Z");
  });

  it("defaults to midnight when time is missing", () => {
    const result = zonedToUtcIso("2026-07-01", undefined, "Europe/Berlin");
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(22);
  });

  it("defaults to Berlin timezone when missing", () => {
    const result = zonedToUtcIso("2026-07-01", "20:00:00");
    expect(result).toBe("2026-07-01T18:00:00.000Z");
  });

  it("returns ISO format string", () => {
    const result = zonedToUtcIso("2026-07-01", "12:00:00", "Europe/Berlin");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("daysInclusive", () => {
  it("returns 3 for dates 3 days apart inclusive", () => {
    expect(daysInclusive("2027-06-18", "2027-06-20")).toBe(3);
  });

  it("returns 1 for same day", () => {
    expect(daysInclusive("2027-06-18", "2027-06-18")).toBe(1);
  });

  it("returns 1 when end date is before start date", () => {
    expect(daysInclusive("2027-06-20", "2027-06-18")).toBe(1);
  });

  it("returns 2 for consecutive days", () => {
    expect(daysInclusive("2027-06-18", "2027-06-19")).toBe(2);
  });

  it("handles month boundaries correctly", () => {
    expect(daysInclusive("2027-06-30", "2027-07-01")).toBe(2);
  });

  it("handles year boundaries correctly", () => {
    expect(daysInclusive("2026-12-31", "2027-01-01")).toBe(2);
  });
});

describe("mapTicketmasterStatus", () => {
  it("returns 'onsale' for 'onsale' code", () => {
    expect(mapTicketmasterStatus("onsale", false)).toBe("onsale");
  });

  it("returns 'cancelled' for 'canceled' code", () => {
    expect(mapTicketmasterStatus("canceled", false)).toBe("cancelled");
  });

  it("returns 'cancelled' for 'cancelled' code", () => {
    expect(mapTicketmasterStatus("cancelled", false)).toBe("cancelled");
  });

  it("returns 'rescheduled' for 'rescheduled' code", () => {
    expect(mapTicketmasterStatus("rescheduled", false)).toBe("rescheduled");
  });

  it("returns 'postponed' for 'postponed' code", () => {
    expect(mapTicketmasterStatus("postponed", false)).toBe("postponed");
  });

  it("returns 'presale' for 'offsale' with presaleActive true", () => {
    expect(mapTicketmasterStatus("offsale", true)).toBe("presale");
  });

  it("returns 'offsale' for 'offsale' with presaleActive false", () => {
    expect(mapTicketmasterStatus("offsale", false)).toBe("offsale");
  });

  it("returns 'presale' for unknown code with presaleActive true", () => {
    expect(mapTicketmasterStatus("unknown", true)).toBe("presale");
  });

  it("returns 'unknown' for unknown code with presaleActive false", () => {
    expect(mapTicketmasterStatus("unknown", false)).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(mapTicketmasterStatus("ONSALE", false)).toBe("onsale");
    expect(mapTicketmasterStatus("OfFsAlE", true)).toBe("presale");
  });

  it("returns 'presale' for undefined code with presaleActive true", () => {
    expect(mapTicketmasterStatus(undefined, true)).toBe("presale");
  });

  it("returns 'unknown' for undefined code with presaleActive false", () => {
    expect(mapTicketmasterStatus(undefined, false)).toBe("unknown");
  });
});

describe("estimateSize", () => {
  it("returns 'festival' not estimated for festivals", () => {
    const result = estimateSize({ isFestival: true, venueName: "Random Venue" });
    expect(result.size).toBe("festival");
    expect(result.estimated).toBe(false);
  });

  it("returns size from capacity when available", () => {
    const club = estimateSize({ isFestival: false, capacity: 400, venueName: "Test" });
    expect(club.size).toBe("club");
    expect(club.estimated).toBe(false);

    const hall = estimateSize({ isFestival: false, capacity: 5000, venueName: "Test" });
    expect(hall.size).toBe("hall");
    expect(hall.estimated).toBe(false);

    const arena = estimateSize({ isFestival: false, capacity: 20000, venueName: "Test" });
    expect(arena.size).toBe("arena");
    expect(arena.estimated).toBe(false);
  });

  it("estimates from venue name when no capacity", () => {
    const result = estimateSize({ isFestival: false, venueName: "Batschkapp" });
    expect(result.size).toBe("club");
    expect(result.estimated).toBe(true);
  });

  it("estimates Festhalle Frankfurt as arena", () => {
    const result = estimateSize({ isFestival: false, venueName: "Festhalle Frankfurt" });
    expect(result.size).toBe("arena");
    expect(result.estimated).toBe(true);
  });

  it("estimates Jahrhunderthalle as hall", () => {
    const result = estimateSize({ isFestival: false, venueName: "Jahrhunderthalle" });
    expect(result.size).toBe("hall");
    expect(result.estimated).toBe(true);
  });

  it("returns unknown estimated for unknown venue", () => {
    const result = estimateSize({ isFestival: false, venueName: "Irgendwas Neues" });
    expect(result.size).toBe("unknown");
    expect(result.estimated).toBe(true);
  });

  it("uses capacity over venue name hints", () => {
    const result = estimateSize({ isFestival: false, capacity: 300, venueName: "Festhalle Frankfurt" });
    expect(result.size).toBe("club");
    expect(result.estimated).toBe(false);
  });
});
