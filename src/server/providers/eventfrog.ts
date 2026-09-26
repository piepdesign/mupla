import "server-only";
import { mapEventfrogEvent, musicRubricIds, parseLocations, parseRubrics, type EfLocation, type EfRubric } from "@/domain/mappers/eventfrog";
import type { MusicEvent } from "@/domain/types";
import { isAllowedImageSource } from "@/lib/images";
import { DAY, HOUR, cached } from "../cache";
import { HttpError, throttledFetch } from "../http";
import type { EventProvider, EventQuery, ProviderResult } from "./types";

/**
 * Eventfrog Public API v1. Checked 2026-09-26:
 * - Reference (OpenAPI 3.0.3, build 2026-08-31): https://docs.api.eventfrog.net/#publicapi-v1
 *   Server https://api.eventfrog.net, Bearer auth, GET /public/v1/events | /locations | /rubrics.
 *   events: lat, lng, r (km), from, to (ISO 8601), country ("ALL" drops streaming events),
 *   rubId (array), page (from 1), perPage (max 1000). Batches of up to 100 ids via repeated `id`.
 * - Key and limits: https://eventfrog.ch/en/help/organizer/settings/api/api-keys.html
 *   Free key per account, read-only public events, 30 requests/min and 2000/day per account.
 *   Keys expire on a date the owner picks; Eventfrog mails reminders before that.
 * The docs recommend a daily refresh, so results are cached for 12 h.
 */

const BASE = "https://api.eventfrog.net/public/v1";
const GAP_MS = 2_100; // 30 requests per minute
const PER_PAGE = 1000;
const MAX_PAGES = 6; // 6 of 2000 daily requests; the response order is not documented, so a cap loses random events
const ID_BATCH = 100;
const TTL = 12 * HOUR;

function key(): string | undefined {
  return process.env.EVENTFROG_API_KEY?.trim() || undefined;
}

async function get(path: string, params: [string, string][]): Promise<unknown> {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of params) url.searchParams.append(k, v);
  const res = await throttledFetch(url.toString(), GAP_MS, { headers: { Authorization: `Bearer ${key()}` } });
  if (res.status === 401 || res.status === 403) throw new HttpError(res.status, "eventfrog", `Eventfrog: API-Key ungültig oder abgelaufen (${res.status})`);
  if (res.status === 429) throw new HttpError(429, "eventfrog", "Eventfrog: Ratelimit erreicht (429)");
  if (!res.ok) throw new HttpError(res.status, "eventfrog", `Eventfrog HTTP ${res.status}`);
  return res.json();
}

const rubrics = () => cached("ef.rubrics", 7 * DAY, async () => parseRubrics(await get("rubrics", [])));

async function locations(ids: string[]): Promise<EfLocation[]> {
  const out: EfLocation[] = [];
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const batch = ids.slice(i, i + ID_BATCH);
    out.push(...parseLocations(await get("locations", [["perPage", String(ID_BATCH)], ...batch.map((id): [string, string] => ["id", id])])));
  }
  return out;
}

type Sweep = { events: Record<string, unknown>[]; locations: EfLocation[]; total: number };

export const eventfrog: EventProvider = {
  id: "eventfrog",
  label: "Eventfrog",
  isConfigured: () => !!key(),

  async fetchEvents(q: EventQuery): Promise<ProviderResult> {
    const warnings: string[] = [];
    const tree = await rubrics();
    const musicIds = musicRubricIds(tree);
    if (!musicIds.length) {
      return { events: [], warnings: ["Eventfrog: keine Musik-Rubriken erkannt, deshalb keine Termine abgefragt."] };
    }

    const params: [string, string][] = [
      ["lat", String(q.center.lat)],
      ["lng", String(q.center.lon)],
      ["r", String(Math.round(q.radiusKm))],
      ["from", q.from.toISOString()],
      ["to", q.to.toISOString()],
      ["country", "ALL"],
      ["perPage", String(PER_PAGE)],
      ...musicIds.map((id): [string, string] => ["rubId", String(id)]),
    ];
    const day = (d: Date) => d.toISOString().slice(0, 10);
    const sweep = await cached<Sweep>(`ef.events.${musicIds.join("-")}.${q.center.lat.toFixed(2)}.${q.center.lon.toFixed(2)}.${Math.round(q.radiusKm)}.${day(q.from)}.${day(q.to)}`, TTL, async () => {
      const events: Record<string, unknown>[] = [];
      let total = 0;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const body = (await get("events", [...params, ["page", String(page)]])) as Record<string, unknown>;
        const list = Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];
        total = typeof body.totalNumberOfResources === "number" ? body.totalNumberOfResources : events.length + list.length;
        events.push(...list);
        if (list.length < PER_PAGE || events.length >= total) break;
      }
      const ids = [...new Set(events.flatMap((e) => (Array.isArray(e.locationIds) ? e.locationIds.map(String) : [])))];
      return { events, locations: await locations(ids), total };
    });

    if (sweep.total > sweep.events.length) {
      warnings.push(`Eventfrog meldet ${sweep.total} Termine im Umkreis, abgerufen wurden ${sweep.events.length}. Der Rest fehlt, welche genau, legt Eventfrog fest.`);
    }

    // Image hosts outside the allowlist in src/lib/images.ts are skipped; name them so the list can be extended.
    const foreign = new Set<string>();
    for (const raw of sweep.events) {
      const src = (raw.emblemToShow as { url?: unknown } | null)?.url;
      if (typeof src === "string" && !isAllowedImageSource(src)) {
        try {
          foreign.add(new URL(src).hostname);
        } catch {}
      }
    }
    if (foreign.size) warnings.push(`Eventfrog-Bilder von nicht freigegebenen Hosts ausgelassen: ${[...foreign].slice(0, 5).join(", ")}.`);

    const locMap = new Map(sweep.locations.map((l) => [l.id, l]));
    const rubricMap = new Map<number, EfRubric>(tree.map((r) => [r.id, r]));
    const fetchedAt = new Date().toISOString();
    const events: MusicEvent[] = [];
    for (const raw of sweep.events) {
      const e = mapEventfrogEvent(raw, locMap, rubricMap, fetchedAt);
      if (e) events.push(e);
    }
    return { events, warnings };
  },
};
