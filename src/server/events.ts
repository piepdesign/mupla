import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dedupe } from "@/domain/merge";
import type { MusicEvent } from "@/domain/types";
import { geocodeCity } from "./geocode";
import { icsFeeds, curated } from "./providers/feeds";
import { ticketmaster } from "./providers/ticketmaster";
import type { EventProvider, EventQuery, ProviderStatus } from "./providers/types";

/** Registered providers. Curation and UI never import these, only getEvents(). */
export const PROVIDERS: EventProvider[] = [ticketmaster, curated, icsFeeds];

/** Nominatim is slow on purpose (1 req/s); geocode at most this many new cities per build. */
const MAX_GEOCODE_PER_RUN = 15;

const CACHE_DIR = join(process.cwd(), process.env.MUPLA_CACHE_DIR ?? ".cache");
const LEDGER = join(CACHE_DIR, "first-seen.json");

/** Remembers when mupla first saw each event id. Basis for "New" and "Neu seit deinem letzten Besuch". */
async function stampFirstSeen(events: MusicEvent[]): Promise<string> {
  let ledger: Record<string, string> = {};
  try {
    ledger = JSON.parse(await readFile(LEDGER, "utf8"));
  } catch {}
  const now = new Date().toISOString();
  let changed = false;
  if (!ledger.__createdAt) {
    ledger.__createdAt = now;
    changed = true;
  }
  for (const e of events) {
    for (const s of e.sources) {
      const k = `${s.provider}:${s.externalId}`;
      if (!ledger[k]) {
        ledger[k] = now;
        changed = true;
      }
      if (!e.firstSeenAt || ledger[k] < e.firstSeenAt) e.firstSeenAt = ledger[k];
    }
  }
  if (changed) {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(LEDGER, JSON.stringify(ledger));
  }
  return ledger.__createdAt;
}

async function fillCoordinates(events: MusicEvent[], warnings: string[]) {
  const missing = new Map<string, MusicEvent[]>();
  for (const e of events) {
    if (e.venue.lat !== undefined || !e.venue.city || !e.venue.country) continue;
    const k = `${e.venue.country}|${e.venue.city}`;
    missing.set(k, [...(missing.get(k) ?? []), e]);
  }
  let n = 0;
  for (const [k, list] of missing) {
    if (n++ >= MAX_GEOCODE_PER_RUN) {
      warnings.push(`${missing.size - MAX_GEOCODE_PER_RUN} Orte ohne Koordinaten warten auf den nächsten Durchlauf.`);
      break;
    }
    const [country, city] = k.split("|");
    try {
      const hit = await geocodeCity(city, country);
      if (hit) for (const e of list) e.venue = { ...e.venue, lat: hit.lat, lon: hit.lon, capacityEstimated: e.venue.capacityEstimated };
    } catch (err) {
      warnings.push(`Geocoding ${city}: ${(err as Error).message}`);
      break;
    }
  }
}

export type EventsResult = { events: MusicEvent[]; providers: ProviderStatus[]; warnings: string[]; builtAt: string; ledgerCreatedAt: string };

export async function getEvents(q: EventQuery): Promise<EventsResult> {
  const statuses: ProviderStatus[] = [];
  const all: MusicEvent[] = [];

  const settled = await Promise.allSettled(
    PROVIDERS.map((p) => (p.isConfigured() ? p.fetchEvents(q) : Promise.reject(new NotConfigured()))),
  );
  settled.forEach((r, i) => {
    const p = PROVIDERS[i];
    if (r.status === "fulfilled") {
      all.push(...r.value.events);
      statuses.push({ id: p.id, label: p.label, state: "ok", count: r.value.events.length, warnings: r.value.warnings });
    } else if (r.reason instanceof NotConfigured) {
      statuses.push({ id: p.id, label: p.label, state: "not-configured", count: 0, message: "Nicht eingerichtet (Key fehlt in .env.local).", warnings: [] });
    } else {
      statuses.push({ id: p.id, label: p.label, state: "failed", count: 0, message: (r.reason as Error).message, warnings: [] });
    }
  });

  const warnings: string[] = [];
  await fillCoordinates(all, warnings);
  const ledgerCreatedAt = await stampFirstSeen(all);
  const now = Date.now();
  const events = dedupe(all).filter((e) => Date.parse(e.endsAt ?? e.startsAt) >= now);
  return { events, providers: statuses, warnings, builtAt: new Date().toISOString(), ledgerCreatedAt };
}

class NotConfigured extends Error {}
