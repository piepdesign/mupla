import type { MusicEvent, Reason, Recommendation, ScoreComponents, TasteProfile } from "./types";
import { normalizeName } from "./normalize";
import { haversineKm, type LatLon } from "@/lib/geo";

/**
 * Recommendation logic from "00 Konzept/(C) Ansichten & Filter.md".
 *
 *   score = w1·profileMatch + w2·reachability + w3·timing + w4·discovery − w5·priceFriction
 *
 * Two steps:
 *  1. matchEvent (server): which profile facts an event touches. Independent of user settings.
 *  2. scoreMatch (client): components, score and reasons for the current settings.
 * Reasons are built only from the facts that produced the components, so they cannot say more than the score knows.
 */

// ---------------------------------------------------------------- constants

export const WEIGHTS = { profileMatch: 0.5, reachability: 0.2, timing: 0.15, discovery: 0.15, priceFriction: 0.2 } as const;

export const PROFILE = {
  /** Direct artist hit: base + share of the artist's normalised profile weight. */
  directBase: 0.6,
  directWeightShare: 0.4,
  /** Similar artist: base + share of Last.fm match (0..1). */
  similarBase: 0.3,
  similarMatchShare: 0.3,
  /** Dormant artist (was top 20, not any more). */
  dormant: 0.5,
  /** Support acts count less than the headliner. */
  supportFactor: 0.6,
  /** Festival line-up hits are summed, then capped: 200 acts must not win automatically. */
  festivalCap: 1.6,
  /** Genre overlap alone is a weak signal. */
  genreShare: 0.35,
} as const;

export const REACH = { freeKm: 50, freeLoss: 0.1, breakKm: 300, atBreak: 0.4, decayKm: 200, unknown: 0.5 } as const;
export const TIMING = { optimumFromDays: 28, optimumToDays: 70, atZero: 0.5, horizonDays: 365, atHorizon: 0.3 } as const;

/** Minimum profile match at discovery 0 ("nur was ich höre"); falls linearly to 0 at discovery 1. */
export const MIN_PROFILE_AT_ZERO_DISCOVERY = 0.35;

// ---------------------------------------------------------------- profile index

export type ProfileIndex = {
  direct: Map<string, { name: string; plays: number; weight: number }>;
  similar: Map<string, { name: string; via: string; match: number }>;
  dormant: Map<string, { name: string; period: string }>;
  tags: Map<string, number>; // tag -> weight 0..1
  adjacentTags: Map<string, string>; // tag -> via
};

export function buildProfileIndex(p: TasteProfile, topTagCount = 25): ProfileIndex {
  const maxW = Math.max(1e-9, ...p.topArtists.map((a) => a.weight));
  return {
    direct: new Map(p.topArtists.map((a) => [normalizeName(a.artist.name), { name: a.artist.name, plays: a.plays, weight: a.weight / maxW }])),
    similar: new Map(p.adjacentArtists.map((a) => [normalizeName(a.artist.name), { name: a.artist.name, via: a.via, match: a.match }])),
    dormant: new Map(p.dormantArtists.map((a) => [normalizeName(a.artist.name), { name: a.artist.name, period: a.lastHeavyPeriod }])),
    tags: new Map(p.topTags.slice(0, topTagCount).map((t) => [t.tag, t.weight])),
    adjacentTags: new Map(p.adjacentTags.map((t) => [t.tag, t.via])),
  };
}

// ---------------------------------------------------------------- step 1: match

export type EventMatch = {
  direct: { name: string; plays: number; weight: number; headliner: boolean }[];
  similar: { name: string; via: string; match: number; headliner: boolean }[];
  dormant: { name: string; period: string }[];
  genres: { tag: string; weight: number }[];
  adjacentGenres: { tag: string; via: string }[];
};

export function matchEvent(e: MusicEvent, idx: ProfileIndex): EventMatch | null {
  const m: EventMatch = { direct: [], similar: [], dormant: [], genres: [], adjacentGenres: [] };
  const acts = e.lineup.length ? e.lineup : [];
  for (const l of acts) {
    const k = normalizeName(l.artist.name);
    const headliner = e.kind === "festival" || l.role === "headliner";
    const d = idx.direct.get(k);
    if (d) m.direct.push({ ...d, headliner });
    else {
      const s = idx.similar.get(k);
      if (s) m.similar.push({ ...s, headliner });
    }
    const z = idx.dormant.get(k);
    if (z) m.dormant.push(z);
  }
  const eventGenres = new Set([...e.genres, ...acts.flatMap((l) => l.artist.genres)]);
  for (const g of eventGenres) {
    const w = idx.tags.get(g);
    if (w !== undefined) m.genres.push({ tag: g, weight: w });
    else {
      const via = idx.adjacentTags.get(g);
      if (via) m.adjacentGenres.push({ tag: g, via });
    }
  }
  m.genres.sort((a, b) => b.weight - a.weight);
  const any = m.direct.length || m.similar.length || m.dormant.length || m.genres.length || m.adjacentGenres.length;
  return any ? m : null;
}

// ---------------------------------------------------------------- step 2: components

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Degressive: the first 50 km cost almost nothing, beyond 300 km the value collapses. */
export function reachability(km: number | undefined): number {
  if (km === undefined) return REACH.unknown;
  if (km <= REACH.freeKm) return 1 - REACH.freeLoss * (km / REACH.freeKm);
  if (km <= REACH.breakKm) {
    const t = (km - REACH.freeKm) / (REACH.breakKm - REACH.freeKm);
    return 1 - REACH.freeLoss - t * (1 - REACH.freeLoss - REACH.atBreak);
  }
  return REACH.atBreak * Math.exp(-(km - REACH.breakKm) / REACH.decayKm);
}

/** Non-linear: optimum at 4 to 10 weeks lead time. */
export function timing(daysAhead: number): number {
  const t = TIMING;
  if (daysAhead < 0) return 0;
  if (daysAhead < t.optimumFromDays) return t.atZero + (1 - t.atZero) * (daysAhead / t.optimumFromDays);
  if (daysAhead <= t.optimumToDays) return 1;
  const x = (daysAhead - t.optimumToDays) / (t.horizonDays - t.optimumToDays);
  return clamp(1 - (1 - t.atHorizon) * x, t.atHorizon * 0.5, 1);
}

export function priceFriction(price: MusicEvent["price"], maxEur: number | undefined): number {
  if (maxEur === undefined || !price || price.currency !== "EUR") return 0;
  const cheapest = price.min ?? price.max;
  if (cheapest === undefined || cheapest <= maxEur) return 0;
  return clamp((cheapest - maxEur) / maxEur);
}

type ArtistSignal = { kind: "direct" | "similar" | "dormant"; value: number; name: string; headliner: boolean };

function artistSignals(m: EventMatch): ArtistSignal[] {
  const P = PROFILE;
  const out: ArtistSignal[] = [];
  for (const d of m.direct) out.push({ kind: "direct", name: d.name, headliner: d.headliner, value: (P.directBase + P.directWeightShare * d.weight) * (d.headliner ? 1 : P.supportFactor) });
  for (const s of m.similar) out.push({ kind: "similar", name: s.name, headliner: s.headliner, value: (P.similarBase + P.similarMatchShare * s.match) * (s.headliner ? 1 : P.supportFactor) });
  for (const z of m.dormant) if (!m.direct.some((d) => d.name === z.name)) out.push({ kind: "dormant", name: z.name, headliner: true, value: P.dormant });
  return out.sort((a, b) => b.value - a.value);
}

export function profileMatch(e: MusicEvent, m: EventMatch): { value: number; source: "artists" | "genre" | "none" } {
  const signals = artistSignals(m);
  const artistValue =
    e.kind === "festival"
      ? clamp(signals.reduce((s, x) => s + x.value, 0) / PROFILE.festivalCap)
      : (signals[0]?.value ?? 0);
  const genreValue = PROFILE.genreShare * (m.genres[0]?.weight ?? 0);
  if (artistValue === 0 && genreValue === 0) return { value: 0, source: "none" };
  return artistValue >= genreValue ? { value: clamp(artistValue), source: "artists" } : { value: genreValue, source: "genre" };
}

/** Novelty: something the profile does not contain yet, but borders on. Only counts with the discovery slider up. */
export function discovery(m: EventMatch, level: number): number {
  const novel = m.direct.length === 0 && (m.similar.length > 0 || m.adjacentGenres.length > 0);
  return novel ? clamp(level) : 0;
}

// ---------------------------------------------------------------- reasons

/** Reasons are derived from the same facts as the components, strongest first. */
export function deriveReasons(e: MusicEvent, m: EventMatch, pm: ReturnType<typeof profileMatch>, disc: number): Reason[] {
  const reasons: Reason[] = [];
  const directs = [...m.direct].sort((a, b) => b.plays - a.plays);

  if (e.kind === "festival" && directs.length >= 2) {
    reasons.push({ type: "lineup-match", count: directs.length, examples: directs.slice(0, 3).map((d) => d.name) });
  } else if (directs[0]) {
    reasons.push({ type: "direct-artist", artist: directs[0].name, plays: directs[0].plays });
  }
  if (m.dormant[0]) reasons.push({ type: "dormant-artist", artist: m.dormant[0].name, period: m.dormant[0].period });
  if (!directs.length && m.similar[0]) {
    const s = [...m.similar].sort((a, b) => b.match - a.match)[0];
    reasons.push({ type: "similar-artist", artist: s.name, via: s.via });
  }
  if (pm.source === "genre" && m.genres[0]) reasons.push({ type: "genre-match", tag: m.genres[0].tag });
  if (disc > 0 && m.adjacentGenres[0] && !directs.length) {
    reasons.push({ type: "adjacent-genre", tag: m.adjacentGenres[0].tag, via: m.adjacentGenres[0].via });
  }
  return reasons;
}

// ---------------------------------------------------------------- score

export type ScoreSettings = { home: LatLon; discoveryLevel: number; priceMaxEur?: number; now: Date };

export function distanceKm(e: MusicEvent, home: LatLon): number | undefined {
  return e.venue.lat !== undefined && e.venue.lon !== undefined ? haversineKm(home, { lat: e.venue.lat, lon: e.venue.lon }) : undefined;
}

export function totalScore(c: ScoreComponents): number {
  return (
    WEIGHTS.profileMatch * c.profileMatch +
    WEIGHTS.reachability * c.reachability +
    WEIGHTS.timing * c.timing +
    WEIGHTS.discovery * c.discovery -
    WEIGHTS.priceFriction * c.priceFriction
  );
}

/** Returns null when the event has no reason or not enough profile match for the discovery level. */
export function scoreMatch(e: MusicEvent, m: EventMatch, s: ScoreSettings): Recommendation | null {
  const pm = profileMatch(e, m);
  const disc = discovery(m, s.discoveryLevel);
  const km = distanceKm(e, s.home);
  const days = (Date.parse(e.startsAt) - s.now.getTime()) / 86_400_000;
  const components: ScoreComponents = {
    profileMatch: pm.value,
    reachability: reachability(km),
    timing: timing(Math.max(0, days)),
    discovery: disc,
    priceFriction: priceFriction(e.price, s.priceMaxEur),
  };
  const minProfile = MIN_PROFILE_AT_ZERO_DISCOVERY * (1 - clamp(s.discoveryLevel));
  if (pm.value < minProfile && disc === 0) return null;

  const reasons = deriveReasons(e, m, pm, disc);
  if (reasons.length === 0) return null; // no anchor, no card
  return {
    event: e,
    score: totalScore(components),
    components,
    distanceKm: km,
    reasons: reasons as [Reason, ...Reason[]],
  };
}
