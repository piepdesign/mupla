import type { MusicEvent, Venue } from "../types";
import { estimateSize, zonedToUtcIso } from "../normalize";

/**
 * Minimal iCalendar (RFC 5545) VEVENT reader for venue and festival feeds.
 * Supports: line unfolding, SUMMARY, DTSTART/DTEND (UTC, TZID, floating, all-day), URL, UID, DESCRIPTION, STATUS.
 * Recurrence rules are ignored on purpose: venue feeds list single dates.
 */

export type FeedConfig = {
  id: string;
  label: string;
  url: string;
  venue: Pick<Venue, "name" | "city" | "country" | "lat" | "lon" | "capacity">;
  /** Treat entries as festival days of one event. */
  festival?: boolean;
  genres?: string[];
};

type RawEvent = Record<string, { value: string; params: Record<string, string> }>;

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
}

export function parseIcs(text: string): RawEvent[] {
  const out: RawEvent[] = [];
  let cur: RawEvent | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur) out.push(cur);
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const [name, ...paramParts] = line.slice(0, idx).split(";");
      const params = Object.fromEntries(paramParts.map((p) => p.split("=") as [string, string]));
      cur[name.toUpperCase()] = { value: line.slice(idx + 1), params };
    }
  }
  return out;
}

/** ICS date -> { iso, timeKnown, localDate }. */
export function icsDate(field: { value: string; params: Record<string, string> } | undefined, defaultTz = "Europe/Berlin") {
  if (!field) return undefined;
  const v = field.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
  if (!m) return undefined;
  const [, y, mo, d, hh, mi, ss, z] = m;
  const localDate = `${y}-${mo}-${d}`;
  if (!hh) return { iso: zonedToUtcIso(localDate, "00:00:00", defaultTz), timeKnown: false, localDate };
  if (z) return { iso: new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, +ss)).toISOString(), timeKnown: true, localDate };
  return { iso: zonedToUtcIso(localDate, `${hh}:${mi}:${ss}`, field.params.TZID ?? defaultTz), timeKnown: true, localDate };
}

export function mapIcsEvents(text: string, feed: FeedConfig, fetchedAt: string): MusicEvent[] {
  const venue: Venue = {
    id: `ics:${feed.id}`,
    ...feed.venue,
    capacityEstimated: false,
    sources: [{ provider: `ics:${feed.id}`, externalId: feed.id, url: feed.url, fetchedAt }],
  };
  const { size, estimated } = estimateSize({ isFestival: !!feed.festival, capacity: feed.venue.capacity, venueName: feed.venue.name });

  return parseIcs(text).flatMap((ev) => {
    const start = icsDate(ev.DTSTART);
    const title = ev.SUMMARY ? unescape(ev.SUMMARY.value) : undefined;
    if (!start || !title) return [];
    const end = icsDate(ev.DTEND);
    const cancelled = ev.STATUS?.value.toUpperCase() === "CANCELLED";
    const uid = ev.UID?.value ?? `${start.localDate}-${title}`;
    const e: MusicEvent = {
      id: `ics:${feed.id}:${uid}`,
      kind: feed.festival ? "festival" : "concert",
      title,
      startsAt: start.iso,
      startTimeKnown: start.timeKnown,
      endsAt: end?.iso,
      durationDays: 1,
      venue,
      // Feeds have no structured line-up; the title stands in as headliner for matching.
      lineup: [{ artist: { id: `ics:${feed.id}:${title}`, name: title, genres: feed.genres ?? [], sources: venue.sources }, role: "headliner" }],
      genres: feed.genres ?? [],
      size,
      sizeEstimated: estimated,
      status: cancelled ? "cancelled" : "unknown",
      officialTicketUrl: ev.URL?.value,
      sources: [{ provider: `ics:${feed.id}`, externalId: uid, url: ev.URL?.value ?? feed.url, fetchedAt }],
    };
    return [e];
  });
}
