import "server-only";
import { buildProfileIndex, matchEvent } from "@/domain/scoring";
import type { Candidate } from "@/domain/curation";
import type { TasteProfile } from "@/domain/types";
import { getEvents, type EventsResult } from "./events";
import { getTasteProfile, type ProfileDiagnostics } from "./profile";
import { getArtistListeners } from "./providers/lastfm";
import { defaultWindow, homeFromEnv, PROFILE_ARTISTS_FOR_EVENT_SEARCH, SWEEP_RADIUS_KM } from "./settings";

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
  const candidates: Candidate[] = [];
  for (const event of events.events) {
    const match = matchEvent(event, idx);
    if (match) candidates.push({ event, match });
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
  };
}
