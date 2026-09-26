import "server-only";
import { buildProfileIndex, matchEvent } from "@/domain/scoring";
import type { Candidate } from "@/domain/curation";
import type { MusicEvent, TasteProfile } from "@/domain/types";
import { getEvents, type EventsResult } from "./events";
import { getTasteProfile, type ProfileDiagnostics } from "./profile";
import { getArtistListeners, getArtistTopTags } from "./providers/lastfm";
import { normalizeGenres, normalizeName } from "@/domain/normalize";
import { TAG_BLOCKLIST } from "@/domain/profile";
import { defaultWindow, homeFromEnv, PROFILE_ARTISTS_FOR_EVENT_SEARCH, SWEEP_RADIUS_KM } from "./settings";

/**
 * Ticketmaster only knows umbrella genres ("Rock"), so every event looked alike to the genre matcher
 * and got the same reason. Headliners that are not in the profile get their Last.fm tags instead (cached 7 days).
 * Capped at the soonest 300 headliners; the first build after a cache wipe takes about 1.5 minutes longer (Last.fm gap 250 ms).
 */
const MAX_TAG_LOOKUPS = 300;
const MIN_TAG_COUNT = 10; // Last.fm tag counts are relative (100 = strongest tag); below 10 is noise

async function enrichHeadlinerTags(events: MusicEvent[], idx: ReturnType<typeof buildProfileIndex>, warnings: string[]) {
  const todo = [...events]
    .filter((e) => e.kind !== "festival")
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((e) => e.lineup.find((l) => l.role === "headliner"))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))
    .filter((l) => !idx.direct.has(normalizeName(l.artist.name)));
  const byName = new Map<string, string[]>();
  let lookups = 0;
  for (const l of todo) {
    const k = normalizeName(l.artist.name);
    if (!byName.has(k)) {
      if (lookups >= MAX_TAG_LOOKUPS) continue;
      lookups++;
      try {
        const tags = await getArtistTopTags({ name: l.artist.name });
        const names = tags.filter((t) => (t.count ?? 100) >= MIN_TAG_COUNT && !TAG_BLOCKLIST.has(t.name)).map((t) => t.name);
        byName.set(k, normalizeGenres(names).slice(0, 5));
      } catch (e) {
        warnings.push(`Genre-Tags unvollständig: ${(e as Error).message}`);
        return;
      }
    }
    const tags = byName.get(k);
    if (tags?.length) l.artist.genres = [...new Set([...tags, ...l.artist.genres])];
  }
  if (todo.length > lookups && lookups >= MAX_TAG_LOOKUPS) warnings.push(`Genre-Tags nur für die ${MAX_TAG_LOOKUPS} nächsten Headliner geladen, spätere Termine haben nur die grobe Ticketmaster-Einordnung.`);
}

/** Listener lookups for "Popular" per build; cached 7 days, so later builds are cheap. */
const MAX_LISTENER_LOOKUPS = 120;

export type CurationData =
  | { ok: false; reason: "no-profile-config" | "profile-failed"; message: string; events?: EventsResult }
  | {
      ok: true;
      username: string;
      candidates: Candidate[];
      totalEvents: number;
      providers: EventsResult["providers"];
      warnings: string[];
      ledgerCreatedAt?: string;
      profileBuiltAt: string;
      profileDiagnostics: ProfileDiagnostics;
      topTags: TasteProfile["topTags"];
      profile: TasteProfile;
      /** Events without any profile relation (search page, artist pages). */
      unrelated: MusicEvent[];
      /** All genres seen on loaded events, sorted, for searching beyond the profile. */
      allGenres: string[];
    };

/**
 * Server half of curation: profile + events -> candidates with their profile matches.
 * Scoring for the user's current settings runs in the browser (src/domain/scoring.ts), so filters work without reloading.
 */
export async function getCurationData(): Promise<CurationData> {
  const user = process.env.LASTFM_USERNAME?.trim();
  if (!user || !process.env.LASTFM_API_KEY?.trim()) {
    return { ok: false, reason: "no-profile-config", message: "LASTFM_USERNAME und LASTFM_API_KEY fehlen in .env.local. Ohne Hörprofil gibt es keine begründeten Empfehlungen." };
  }

  let profileResult;
  try {
    profileResult = await getTasteProfile(user);
  } catch (e) {
    return { ok: false, reason: "profile-failed", message: `Hörprofil konnte nicht geladen werden: ${(e as Error).message}` };
  }
  const { profile, diagnostics } = profileResult;

  const searchArtists = [
    ...profile.topArtists.slice(0, PROFILE_ARTISTS_FOR_EVENT_SEARCH).map((a) => a.artist.name),
    ...profile.dormantArtists.slice(0, 10).map((a) => a.artist.name),
  ];
  const events = await getEvents({ center: homeFromEnv(), radiusKm: SWEEP_RADIUS_KM, artists: [...new Set(searchArtists)], ...defaultWindow() });

  const idx = buildProfileIndex(profile);
  await enrichHeadlinerTags(events.events, idx, events.warnings);
  const candidates: Candidate[] = [];
  const unrelated: MusicEvent[] = [];
  const genres = new Set<string>();
  for (const event of events.events) {
    const match = matchEvent(event, idx);
    if (match) candidates.push({ event, match });
    else unrelated.push(event);
    for (const g of event.genres) genres.add(g);
    for (const l of event.lineup) for (const g of l.artist.genres) genres.add(g);
  }

  // Listener counts for headliners with an artist match (Popular view).
  const warnings = [...events.warnings];
  let lookups = 0;
  for (const c of candidates) {
    if (!c.match.direct.length && !c.match.similar.length) continue;
    const head = c.event.lineup.find((l) => l.role === "headliner") ?? c.event.lineup[0];
    if (!head || lookups >= MAX_LISTENER_LOOKUPS) continue;
    lookups++;
    try {
      c.listeners = (await getArtistListeners(head.artist.name)) ?? undefined;
    } catch (e) {
      warnings.push(`Hörerzahlen unvollständig: ${(e as Error).message}`);
      break;
    }
  }

  return {
    ok: true,
    username: user,
    candidates,
    totalEvents: events.events.length,
    providers: events.providers,
    warnings,
    ledgerCreatedAt: events.ledgerCreatedAt,
    profileBuiltAt: profile.builtAt,
    profileDiagnostics: diagnostics,
    topTags: profile.topTags.slice(0, 40),
    profile,
    unrelated,
    allGenres: [...genres].sort((a, b) => a.localeCompare(b, "de")),
  };
}
