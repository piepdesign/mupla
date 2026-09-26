import type { MusicEvent } from "./types";
import { nameSimilarity, normalizeCity } from "./normalize";

/**
 * Duplicate rule from "01 Datenquellen/(C) Datenmodell.md":
 * same event when the date is within one day, the city matches and the headliner name is similar.
 * On field conflicts the deeper source wins; the other one stays in sources[].
 */

export const MERGE = { dayTolerance: 1, minNameSimilarity: 0.85 } as const;

const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar day number in Europe/Berlin, so 23:30 and 00:30 across midnight count as adjacent days, not the same. */
export function localDayNumber(iso: string): number {
  return Math.round(Date.parse(`${berlinDay.format(new Date(iso))}T00:00:00Z`) / 86_400_000);
}

const primaryProvider = (e: MusicEvent) => e.sources[0]?.provider;

/** Headliner, or the title when there is no line-up (ICS feeds). */
export function headlinerName(e: MusicEvent): string {
  return e.lineup.find((l) => l.role === "headliner")?.artist.name ?? e.lineup[0]?.artist.name ?? e.title;
}

export function isSameEvent(a: MusicEvent, b: MusicEvent): boolean {
  // Two records from the same provider are two events (e.g. two nights in a row), never duplicates.
  if (primaryProvider(a) === primaryProvider(b)) return false;
  if (Math.abs(localDayNumber(a.startsAt) - localDayNumber(b.startsAt)) > MERGE.dayTolerance) return false;
  if (normalizeCity(a.venue.city) !== normalizeCity(b.venue.city)) return false;
  const sim = Math.max(
    nameSimilarity(headlinerName(a), headlinerName(b)),
    nameSimilarity(a.title, b.title),
  );
  return sim >= MERGE.minNameSimilarity;
}

/** How many optional fields a record fills. The deeper record wins conflicts. */
export function depth(e: MusicEvent): number {
  let d = 0;
  if (e.startTimeKnown) d++;
  if (e.endsAt) d++;
  if (e.price?.min !== undefined || e.price?.max !== undefined) d++;
  if (e.venue.lat !== undefined) d++;
  if (e.venue.capacity !== undefined) d++;
  if (e.officialTicketUrl) d++;
  if (e.imageUrl) d++;
  if (e.status !== "unknown") d++;
  d += Math.min(e.lineup.length, 5);
  d += Math.min(e.genres.length, 3);
  return d;
}

export function mergePair(a: MusicEvent, b: MusicEvent): MusicEvent {
  const [win, lose] = depth(a) >= depth(b) ? [a, b] : [b, a];
  const lineupNames = new Set(win.lineup.map((l) => l.artist.name.toLowerCase()));
  return {
    ...lose,
    ...win,
    endsAt: win.endsAt ?? lose.endsAt,
    durationDays: win.endsAt ? win.durationDays : (lose.durationDays ?? win.durationDays),
    price: win.price ?? lose.price,
    officialTicketUrl: win.officialTicketUrl ?? lose.officialTicketUrl,
    merchUrl: win.merchUrl ?? lose.merchUrl,
    imageUrl: win.imageUrl ?? lose.imageUrl,
    imageCredit: win.imageUrl ? win.imageCredit : lose.imageCredit,
    announcedAt: win.announcedAt ?? lose.announcedAt,
    firstSeenAt: [win.firstSeenAt, lose.firstSeenAt].filter(Boolean).sort()[0],
    firstEditionYear: win.firstEditionYear ?? lose.firstEditionYear,
    venue: {
      ...lose.venue,
      ...win.venue,
      lat: win.venue.lat ?? lose.venue.lat,
      lon: win.venue.lon ?? lose.venue.lon,
      capacity: win.venue.capacity ?? lose.venue.capacity,
      capacityEstimated: win.venue.capacity !== undefined ? win.venue.capacityEstimated : lose.venue.capacityEstimated,
      sources: [...win.venue.sources, ...lose.venue.sources],
    },
    // Keep the winner's line-up, add acts only the other source knows (e.g. curated day/stage data).
    lineup: [...win.lineup, ...lose.lineup.filter((l) => !lineupNames.has(l.artist.name.toLowerCase()))],
    // Genres stay with the record that states them, so a reason names the right provider.
    genres: win.genres.length ? win.genres : lose.genres,
    category: win.genres.length ? win.category : (lose.category ?? win.category),
    genreSource: win.genres.length ? win.genreSource : (lose.genreSource ?? lose.sources[0]?.provider),
    sources: [...win.sources, ...lose.sources],
  };
}

/** O(n²) within a day bucket, fine for a few thousand events. Order-independent result ids: the deeper record's id. */
export function dedupe(events: MusicEvent[]): MusicEvent[] {
  const byDay = new Map<number, MusicEvent[]>();
  const dayOf = (e: MusicEvent) => localDayNumber(e.startsAt);
  const out: MusicEvent[] = [];
  for (const e of [...events].sort((x, y) => depth(y) - depth(x))) {
    const d = dayOf(e);
    const candidates = [...(byDay.get(d - 1) ?? []), ...(byDay.get(d) ?? []), ...(byDay.get(d + 1) ?? [])];
    const match = candidates.find((c) => isSameEvent(c, e));
    if (match) {
      const merged = mergePair(match, e);
      Object.assign(match, merged);
      continue;
    }
    const copy = { ...e };
    out.push(copy);
    byDay.set(d, [...(byDay.get(d) ?? []), copy]);
  }
  return out.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
