# (C) Datenmodell — mupla

> **Stand:** 2026-09-26. Entwurf, wird in Etappe 0/1 gegen die tatsächlich verfügbaren Felder geschärft. Alle Provider bilden auf dieses Schema ab (siehe [[03 Projekte/mupla/01 Datenquellen/(C) Provider-Recherche|Provider-Recherche]]).

## Grundsätze

- **Ein Schema, viele Provider.** Kuratierung und UI kennen keinen Provider.
- **Herkunft bleibt am Datensatz.** Jedes Event trägt `sources[]`. Zwei Quellen für dasselbe Event werden zusammengeführt, nicht doppelt gezeigt.
- **Unbekannt ist ein Wert, nicht null-still.** Felder, die fehlen, werden in der UI als „unbekannt" oder „geschätzt" ausgewiesen, nie stillschweigend weggelassen.
- **Caching ist Pflicht**, nicht Optimierung: MusicBrainz und Nominatim erlauben nur wenige Anfragen pro Sekunde.

## Kernentitäten (TypeScript-Entwurf)

```ts
type Provider = 'ticketmaster' | 'musicbrainz' | 'lastfm' | 'feed' | string;

type SourceRef = {
  provider: Provider;
  externalId: string;
  url: string;
  fetchedAt: string;        // ISO
};

type Artist = {
  id: string;               // intern
  name: string;
  mbid?: string;            // MusicBrainz, Brücke zwischen Quellen
  genres: string[];
  listeners?: number;       // Last.fm, für Popular
  foundedYear?: number;
  imageUrl?: string;
  sources: SourceRef[];
};

type Venue = {
  id: string;
  name: string;
  city: string;
  country: string;          // ISO-3166-1 alpha-2
  lat?: number;
  lon?: number;
  capacity?: number;
  capacityEstimated?: boolean;
  sources: SourceRef[];
};

type EventKind = 'concert' | 'tour-date' | 'festival' | 'club-night' | 'other';
type EventSize = 'club' | 'hall' | 'arena' | 'open-air' | 'festival' | 'unknown';

type MusicEvent = {
  id: string;
  kind: EventKind;
  title: string;
  startsAt: string;         // ISO mit Zeitzone
  endsAt?: string;          // gesetzt bei mehrtägigen Festivals
  durationDays?: number;
  venue: Venue;
  lineup: LineupEntry[];    // bei Einzelkonzert genau ein Eintrag als Headliner
  genres: string[];
  price?: PriceRange;
  size: EventSize;
  status: 'onsale' | 'presale' | 'soldout' | 'cancelled' | 'unknown';
  officialTicketUrl?: string;
  merchUrl?: string;
  announcedAt?: string;     // für Ansicht "New"
  firstEditionYear?: number;// neu gegründetes Festival
  sources: SourceRef[];
};

type LineupEntry = {
  artist: Artist;
  role: 'headliner' | 'support' | 'lineup';
  day?: string;             // Festivaltag
  stage?: string;
};

type PriceRange = {
  min?: number;
  max?: number;
  currency: string;         // ISO-4217
  estimated?: boolean;
};
```

## Profil und Kuratierung

```ts
type TasteProfile = {
  username: string;
  builtAt: string;
  topArtists: { artist: Artist; plays: number; weight: number }[];
  topTags: { tag: string; weight: number }[];
  adjacentArtists: { artist: Artist; via: string }[];   // via = Ursprungs-Artist
  adjacentTags: { tag: string; via: string }[];
  dormantArtists: { artist: Artist; lastHeavyPeriod: string }[]; // Ansicht "Wiedersehen"
};

type Recommendation = {
  event: MusicEvent;
  score: number;
  components: {                    // macht die Begründung prüfbar
    profileMatch: number;
    reachability: number;
    timing: number;
    discovery: number;
    priceFriction: number;
  };
  reasons: Reason[];               // mindestens einer, sonst wird nicht ausgespielt
};

type Reason =
  | { type: 'direct-artist'; artist: string; plays: number }
  | { type: 'similar-artist'; artist: string; via: string }
  | { type: 'lineup-match'; count: number; examples: string[] }
  | { type: 'genre-match'; tag: string }
  | { type: 'adjacent-genre'; tag: string; via: string }
  | { type: 'dormant-artist'; artist: string; period: string };
```

## Favoriten (Stufe 1, lokal)

```ts
type Favorites = {
  version: 1;
  artists: string[];        // interne IDs plus Name als Fallback
  genres: string[];
  events: string[];
  festivals: string[];
  lastSeenAt: string;       // Grundlage für "Neu seit deinem letzten Besuch"
};
```

Ablage im Browser-Speicher, zusätzlich Export und Import als JSON. Die `version`-Eigenschaft steht bewusst drin: sie macht den späteren Umzug in eine Datenbank (Stufe 2) zu einer Migration statt zu einem Datenverlust.

## Zusammenführung doppelter Events

Zwei Datensätze gelten als dasselbe Event, wenn Datum (Toleranz ein Tag), Stadt und der Name des Headliners übereinstimmen (normalisierte Zeichenketten, Ähnlichkeitsvergleich). Bei Konflikten in den Feldern gilt die Quelle mit höherer Tiefe; die verworfene bleibt in `sources[]` erhalten.
