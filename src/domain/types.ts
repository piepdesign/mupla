/**
 * Normalised schema from "01 Datenquellen/(C) Datenmodell.md".
 * Curation and UI only know these types, never a provider.
 */

export type Provider = "ticketmaster" | "musicbrainz" | "lastfm" | "wikidata" | "curated" | (string & {});

export type SourceRef = {
  provider: Provider;
  externalId: string;
  url: string;
  fetchedAt: string; // ISO
};

export type Artist = {
  id: string;
  name: string;
  mbid?: string;
  genres: string[];
  listeners?: number;
  foundedYear?: number;
  imageUrl?: string;
  sources: SourceRef[];
};

export type Venue = {
  id: string;
  name: string;
  city: string;
  country: string; // ISO-3166-1 alpha-2
  lat?: number;
  lon?: number;
  capacity?: number;
  capacityEstimated?: boolean;
  sources: SourceRef[];
};

export type EventKind = "concert" | "tour-date" | "festival" | "club-night" | "other";
export type EventSize = "club" | "hall" | "arena" | "open-air" | "festival" | "unknown";
export type EventStatus = "onsale" | "presale" | "soldout" | "cancelled" | "postponed" | "rescheduled" | "offsale" | "unknown";

export type LineupEntry = {
  artist: Artist;
  role: "headliner" | "support" | "lineup";
  day?: string;
  stage?: string;
};

export type PriceRange = {
  min?: number;
  max?: number;
  currency: string; // ISO-4217
  estimated?: boolean;
};

export type MusicEvent = {
  id: string;
  kind: EventKind;
  title: string;
  startsAt: string; // ISO with offset
  /** false when the provider only knows the day (time TBA). */
  startTimeKnown: boolean;
  endsAt?: string;
  durationDays?: number;
  venue: Venue;
  lineup: LineupEntry[];
  genres: string[];
  price?: PriceRange;
  size: EventSize;
  sizeEstimated?: boolean;
  status: EventStatus;
  officialTicketUrl?: string;
  merchUrl?: string;
  imageUrl?: string;
  /** Credit line the provider asks to show with the image. */
  imageCredit?: string;
  announcedAt?: string;
  /** First time mupla saw this event. Approximates "newly announced" (no provider has an announcement date). */
  firstSeenAt?: string;
  firstEditionYear?: number;
  sources: SourceRef[];
};

export type TasteProfile = {
  username: string;
  builtAt: string;
  topArtists: { artist: Artist; plays: number; weight: number }[];
  topTags: { tag: string; weight: number }[];
  adjacentArtists: { artist: Artist; via: string; match: number }[];
  adjacentTags: { tag: string; via: string; method: "tag.getSimilar" | "similar-artists" }[];
  dormantArtists: { artist: Artist; lastHeavyPeriod: string; plays: number }[];
};

export type ScoreComponents = {
  profileMatch: number;
  reachability: number;
  timing: number;
  discovery: number;
  priceFriction: number;
};

export type Reason =
  | { type: "direct-artist"; artist: string; plays: number }
  | { type: "similar-artist"; artist: string; via: string }
  | { type: "lineup-match"; count: number; examples: string[] }
  | { type: "genre-match"; tag: string; artist?: string }
  | { type: "adjacent-genre"; tag: string; via: string }
  | { type: "dormant-artist"; artist: string; period: string };

export type Recommendation = {
  event: MusicEvent;
  score: number;
  components: ScoreComponents;
  distanceKm?: number;
  reasons: [Reason, ...Reason[]]; // at least one, enforced by the type
};

export type Favorites = {
  version: 1;
  artists: string[];
  genres: string[];
  events: string[];
  festivals: string[];
  lastSeenAt: string;
  /** Event ids already known per favourite artist, for "Neu seit deinem letzten Besuch". */
  knownEventIds?: string[];
};
