import type { MusicEvent, Recommendation } from "./types";
import type { ViewSlug } from "./views";
import { scoreMatch, type EventMatch, type ScoreSettings } from "./scoring";

/**
 * Views are sort/filter combinations over one candidate pool (no data pot per view).
 */

export type Candidate = { event: MusicEvent; match: EventMatch; listeners?: number };

export type CurationContext = ScoreSettings & {
  /** When the first-seen ledger started. Events seen in that first run are not "new". */
  ledgerCreatedAt?: string;
  favoriteEventIds?: Set<string>;
};

export const VIEW_RULES = {
  newWithinDays: 21,
  newFirstEditionYears: 1,
  lastChanceDays: 14,
  grenzgaengerMinDiscovery: 0.7,
} as const;

const DAY = 86_400_000;
const sizeRank: Record<MusicEvent["size"], number> = { club: 0.2, hall: 0.5, "open-air": 0.7, arena: 0.9, festival: 1, unknown: 0.3 };

export function popularity(c: Candidate): number {
  const listeners = c.listeners ? Math.min(1, Math.log10(c.listeners) / 7) : 0; // 10M listeners -> 1
  return 0.7 * listeners + 0.3 * sizeRank[c.event.size];
}

export type ViewResult = { items: Recommendation[]; note?: string };

function score(cands: Candidate[], ctx: CurationContext): (Recommendation & { cand: Candidate })[] {
  const out: (Recommendation & { cand: Candidate })[] = [];
  for (const c of cands) {
    const r = scoreMatch(c.event, c.match, ctx);
    if (r) out.push({ ...r, cand: c });
  }
  return out;
}

const byScore = (a: Recommendation, b: Recommendation) => b.score - a.score;
const byDate = (a: Recommendation, b: Recommendation) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt);
const hasArtistAnchor = (r: Recommendation) => r.reasons.some((x) => x.type !== "genre-match" && x.type !== "adjacent-genre");
const withinDays = (r: Recommendation, now: Date, days: number) => Date.parse(r.event.startsAt) - now.getTime() <= days * DAY;
const strip = (list: (Recommendation & { cand: Candidate })[]): Recommendation[] =>
  list.map(({ cand, ...r }) => {
    void cand;
    return r;
  });

export function applyView(slug: ViewSlug, cands: Candidate[], ctx: CurationContext): ViewResult {
  const now = ctx.now;
  switch (slug) {
    case "for-you":
      return { items: strip(score(cands, ctx).sort(byScore)) };
    case "upcoming":
      return { items: strip(score(cands, ctx).filter(hasArtistAnchor).sort(byDate)) };
    case "nearby":
      return {
        items: strip(
          score(cands, ctx)
            .filter((r) => r.distanceKm !== undefined)
            .sort((a, b) => a.distanceKm! - b.distanceKm! || b.score - a.score),
        ),
      };
    case "popular":
      return {
        items: strip(score(cands, ctx).filter(hasArtistAnchor).sort((a, b) => popularity(b.cand) - popularity(a.cand) || b.score - a.score)),
        note: "Beliebtheit aus der Last.fm-Hörerzahl des Headliners und der (teils geschätzten) Venue-Größe.",
      };
    case "new": {
      const year = now.getUTCFullYear();
      const ledgerStart = ctx.ledgerCreatedAt ? Date.parse(ctx.ledgerCreatedAt) + 3_600_000 : Infinity;
      return {
        items: strip(
          score(cands, ctx)
            .filter((r) => {
              const e = r.event;
              const firstEdition = e.firstEditionYear !== undefined && e.firstEditionYear >= year - VIEW_RULES.newFirstEditionYears;
              const seen = e.firstSeenAt ? Date.parse(e.firstSeenAt) : 0;
              const newlySeen = seen > ledgerStart && now.getTime() - seen <= VIEW_RULES.newWithinDays * DAY;
              return firstEdition || newlySeen;
            })
            .sort(byScore),
        ),
        note: "Kein freier Dienst liefert ein Ankündigungsdatum. „Neu“ heißt hier: seit mupla den Termin zum ersten Mal gesehen hat (höchstens drei Wochen), oder Erstausgabe laut deiner eigenen Liste.",
      };
    }
    case "this-week":
      return { items: strip(score(cands, ctx).filter((r) => withinDays(r, now, 7)).sort(byScore)) };
    case "this-month":
      return { items: strip(score(cands, ctx).filter((r) => withinDays(r, now, 30)).sort(byScore)) };
    case "this-year": {
      const end = Date.UTC(now.getUTCFullYear() + 1, 0, 1);
      return { items: strip(score(cands, ctx).filter((r) => Date.parse(r.event.startsAt) < end).sort(byScore)) };
    }
    case "festivals":
      return { items: strip(score(cands, ctx).filter((r) => r.event.kind === "festival").sort(byScore)) };
    case "grenzgaenger": {
      const bold = { ...ctx, discoveryLevel: Math.max(ctx.discoveryLevel, VIEW_RULES.grenzgaengerMinDiscovery) };
      return {
        items: strip(
          score(cands, bold)
            .filter((r) => r.components.discovery > 0)
            .sort((a, b) => b.components.discovery + b.score - (a.components.discovery + a.score)),
        ),
      };
    }
    case "wiedersehen":
      return { items: strip(score(cands, ctx).filter((r) => r.reasons.some((x) => x.type === "dormant-artist")).sort(byScore)) };
    case "letzte-chance":
      return {
        items: strip(
          score(cands, ctx)
            .filter((r) => withinDays(r, now, VIEW_RULES.lastChanceDays))
            .filter((r) => !["soldout", "cancelled", "offsale", "postponed"].includes(r.event.status))
            .sort(byDate),
        ),
        note: "Ob noch Tickets da sind, meldet keine freie Quelle verlässlich. Hier steht, was in den nächsten zwei Wochen stattfindet und nicht als ausverkauft oder abgesagt gemeldet ist.",
      };
    case "favoriten":
      return {
        items: strip(score(cands, { ...ctx, discoveryLevel: 1 }).filter((r) => ctx.favoriteEventIds?.has(r.event.id)).sort(byDate)),
      };
  }
}
