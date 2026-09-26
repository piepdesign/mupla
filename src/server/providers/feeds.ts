import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { mapCurated, validateCurated, type CuratedEntry } from "@/domain/mappers/curated";
import { mapIcsEvents, type FeedConfig } from "@/domain/mappers/ics";
import { HOUR, cached } from "../cache";
import { throttledFetch } from "../http";
import type { EventProvider, EventQuery, ProviderResult } from "./types";

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "data", file), "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`data/${file} ist kein gültiges JSON: ${(e as Error).message}`);
  }
}

const inWindow = (iso: string, q: EventQuery) => {
  const t = Date.parse(iso);
  return t >= q.from.getTime() && t <= q.to.getTime();
};

/** Hand-maintained events from data/curated-events.json. */
export const curated: EventProvider = {
  id: "curated",
  label: "Eigene Liste",
  isConfigured: () => true,
  async fetchEvents(q) {
    const entries = (await readJson<CuratedEntry[]>("curated-events.json")) ?? [];
    const warnings: string[] = [];
    const fetchedAt = new Date().toISOString();
    const events = entries.flatMap((e) => {
      const problem = validateCurated(e);
      if (problem) {
        warnings.push(`curated-events.json: ${problem}`);
        return [];
      }
      return [mapCurated(e, fetchedAt)];
    });
    return { events: events.filter((e) => inWindow(e.endsAt ?? e.startsAt, q)), warnings };
  },
};

/** iCalendar feeds of single venues or festivals listed in data/feeds.json. */
export const icsFeeds: EventProvider = {
  id: "ics",
  label: "Venue-Kalender",
  isConfigured: () => true,
  async fetchEvents(q): Promise<ProviderResult> {
    const feeds = (await readJson<FeedConfig[]>("feeds.json")) ?? [];
    const warnings: string[] = [];
    const results = await Promise.allSettled(
      feeds.map((f) =>
        cached(`ics.${f.id}`, 6 * HOUR, async () => {
          const res = await throttledFetch(f.url, 500, { headers: { Accept: "text/calendar" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        }).then((text) => mapIcsEvents(text, f, new Date().toISOString())),
      ),
    );
    const events = results.flatMap((r, i) => {
      if (r.status === "fulfilled") return r.value;
      warnings.push(`Kalender „${feeds[i].label}“ nicht erreichbar: ${(r.reason as Error).message}`);
      return [];
    });
    return { events: events.filter((e) => inWindow(e.startsAt, q)), warnings };
  },
};
