import type { EventSize, EventStatus } from "./types";

/**
 * Normalisation rules shared by all providers. Pure functions, covered by normalize.test.ts.
 */

// ---------- strings and names ----------

/** Comparable form of a name: no accents, no "the", no punctuation, lowercase. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(the|die|der|les|los)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Dice coefficient on character bigrams of the normalised names, 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a).replace(/ /g, "");
  const y = normalizeName(b).replace(/ /g, "");
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const gx = grams(x);
  const gy = grams(y);
  let overlap = 0;
  for (const [g, n] of gx) overlap += Math.min(n, gy.get(g) ?? 0);
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

export function normalizeCity(s: string): string {
  const n = normalizeName(s)
    .replace(/\b(am main|an der lahn|im breisgau|am rhein|a m)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return CITY_ALIASES[n] ?? n;
}

const CITY_ALIASES: Record<string, string> = {
  koln: "koln", cologne: "koln", koeln: "koln",
  munchen: "munchen", munich: "munchen", muenchen: "munchen",
  nurnberg: "nurnberg", nuremberg: "nurnberg", nuernberg: "nurnberg",
  frankfurt: "frankfurt",
  wien: "wien", vienna: "wien",
  zurich: "zurich", zuerich: "zurich",
  bruxelles: "brussel", brussels: "brussel", brussel: "brussel",
  praha: "praha", prague: "praha",
  warszawa: "warszawa", warsaw: "warszawa",
  kobenhavn: "kobenhavn", copenhagen: "kobenhavn",
};

// ---------- country, currency ----------

const COUNTRY_ALIASES: Record<string, string> = { UK: "GB", EL: "GR" };

/** ISO-3166-1 alpha-2, uppercase. Returns undefined for anything that is not two letters. */
export function normalizeCountry(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return undefined;
  return COUNTRY_ALIASES[c] ?? c;
}

/** ISO-4217, uppercase. No conversion: stage 1 shows prices in their own currency. */
export function normalizeCurrency(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : undefined;
}

// ---------- genres ----------

const GENRE_DROP = new Set(["undefined", "other", "music", "miscellaneous", "misc", "various", ""]);
const GENRE_ALIASES: Record<string, string> = {
  "hip-hop/rap": "hip-hop",
  "hip hop": "hip-hop",
  rap: "hip-hop",
  "r&b": "rnb",
  "r and b": "rnb",
  "rhythm and blues": "rnb",
  "dance/electronic": "electronic",
  electronica: "electronic",
  "electronic music": "electronic",
  "alternative rock": "alternative",
  "indie-rock": "indie rock",
  "singer-songwriter": "singer-songwriter",
  "world music": "world",
  "hard rock": "hard rock",
  "heavy metal": "metal",
  "classical music": "classical",
};

/**
 * Umbrella genres as Ticketmaster classifies them. They say little about taste on their own
 * ("rock" fits half the programme), so matching prefers specific tags and weighs these down.
 */
export const BROAD_GENRES = new Set([
  "rock", "pop", "electronic", "hip-hop", "alternative", "metal", "dance", "rnb", "country", "jazz", "classical",
  "folk", "latin", "world", "blues", "reggae", "punk", "soul", "indie", "schlager", "chanson francaise", "german",
]);

/** Lowercase tag form comparable with Last.fm tags. Splits "Dance/Electronic"-style labels only via the alias table. */
export function normalizeGenre(raw: string): string | undefined {
  const g = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (GENRE_DROP.has(g)) return undefined;
  return GENRE_ALIASES[g] ?? g;
}

export function normalizeGenres(raw: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    if (!r) continue;
    const g = normalizeGenre(r);
    if (g && !out.includes(g)) out.push(g);
  }
  return out;
}

/**
 * A provider category such as "Rock/Pop" or "House / Techno" is a shelf in its catalogue, not a
 * statement about what is played: a techno night filed under House/Techno says nothing about house.
 * So a category resolves to a genre only when it names exactly one, or when one name refines the
 * other ("Rock" + "Hard Rock" -> "hard rock"). Otherwise only the parts the event title names
 * itself count, and the category is kept as `category` so a reason can quote it.
 */
export function classifyCategory(parts: (string | undefined)[], title?: string): { genres: string[]; category?: string } {
  const labels = parts.map((p) => p?.trim()).filter((p): p is string => !!p && normalizeGenre(p) !== undefined);
  const genres = normalizeGenres(labels);
  if (genres.length <= 1) return { genres };
  const refined = genres.filter((g) => !genres.some((o) => o !== g && o.includes(g)));
  if (refined.length === 1) return { genres: refined };
  const category = [...new Set(labels)].join(" / ");
  return { genres: title ? genres.filter((g) => titleNames(title, g)) : [], category };
}

/** Whether a title names a genre as a word: "90er Techno & Rave" names techno, "Poppy" does not name pop. */
export function titleNames(title: string, genre: string): boolean {
  const variants = [genre, ...Object.entries(GENRE_ALIASES).filter(([, v]) => v === genre).map(([k]) => k)];
  const t = title.toLowerCase();
  return variants.some((v) => {
    const re = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[- ]/g, "[- ]?");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${re}($|[^\\p{L}\\p{N}])`, "u").test(t);
  });
}

/** "Rock / Pop", "Techno & House", "Jazz und Blues" -> parts. "R&B" stays whole: "&" splits only with spaces. */
export function splitCategory(label: string): string[] {
  return label.split(/\s*[/,]\s*|\s+[&+]\s+|\s+und\s+|\s+and\s+/i).map((p) => p.trim()).filter(Boolean);
}

/** Genre words inside a category label, for filtering and search (not for reasons). */
export function categoryGenres(category: string | undefined): string[] {
  return category ? normalizeGenres(splitCategory(category)) : [];
}

// ---------- time ----------

/** Offset in minutes of `timeZone` at the given UTC instant. */
function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60000);
}

/**
 * Local wall time in a zone -> ISO string in UTC.
 * Handles DST by re-checking the offset at the resulting instant.
 */
export function zonedToUtcIso(localDate: string, localTime: string | undefined, timeZone = "Europe/Berlin"): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const [hh, mm, ss] = (localTime ?? "00:00:00").split(":").map((x) => Number(x) || 0);
  const naive = Date.UTC(y, m - 1, d, hh, mm, ss);
  let utc = naive - tzOffsetMinutes(naive, timeZone) * 60000;
  utc = naive - tzOffsetMinutes(utc, timeZone) * 60000;
  return new Date(utc).toISOString();
}

/** Calendar days covered, inclusive: 18.06. to 20.06. is 3 days. */
export function daysInclusive(startLocalDate: string, endLocalDate: string): number {
  const a = Date.parse(`${startLocalDate}T00:00:00Z`);
  const b = Date.parse(`${endLocalDate}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return Math.round((b - a) / 86_400_000) + 1;
}

// ---------- status ----------

export function mapTicketmasterStatus(code: string | undefined, presaleActive: boolean): EventStatus {
  switch ((code ?? "").toLowerCase()) {
    case "onsale":
      return "onsale";
    case "offsale":
      return presaleActive ? "presale" : "offsale";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "postponed":
      return "postponed";
    case "rescheduled":
      return "rescheduled";
    default:
      return presaleActive ? "presale" : "unknown";
  }
}

// ---------- size ----------

/** Capacity bands. Thresholds are a design decision, not provider data. */
export const SIZE_BANDS = { club: 1_000, hall: 6_000 } as const;

export function sizeFromCapacity(capacity: number): EventSize {
  if (capacity <= SIZE_BANDS.club) return "club";
  if (capacity <= SIZE_BANDS.hall) return "hall";
  return "arena";
}

const SIZE_HINTS: [RegExp, EventSize][] = [
  [/\b(stadion|stadium|arena|dome|lanxess|olympiahalle|festhalle frankfurt|uber arena|barclays)\b/i, "arena"],
  [/\b(open ?air|freilicht|amphitheater|waldbuhne|waldbühne|park|wiese|burg|loreley)\b/i, "open-air"],
  [/\b(halle|hall|jahrhunderthalle|palladium|mitsubishi|zenith|tempodrom|columbiahalle|e-werk|stadthalle|theater|theatre|philharmonie|oper)\b/i, "hall"],
  [/\b(club|keller|bar|kneipe|lounge|cafe|café|kulturzentrum|jugendzentrum|juz|mtc|batschkapp|zoom|bett|nachtleben|gebaude 9|gebäude 9)\b/i, "club"],
];

/** Size from capacity when known, else a keyword estimate from the venue name. */
export function estimateSize(opts: { isFestival: boolean; capacity?: number; venueName: string }): { size: EventSize; estimated: boolean } {
  if (opts.isFestival) return { size: "festival", estimated: false };
  if (opts.capacity && opts.capacity > 0) return { size: sizeFromCapacity(opts.capacity), estimated: false };
  for (const [re, size] of SIZE_HINTS) if (re.test(opts.venueName)) return { size, estimated: true };
  return { size: "unknown", estimated: true };
}
