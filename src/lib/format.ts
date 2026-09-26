import type { MusicEvent, PriceRange } from "@/domain/types";

const TZ = "Europe/Berlin";

const dayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const shortFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: TZ });

export function formatEventDate(e: Pick<MusicEvent, "startsAt" | "endsAt" | "durationDays" | "startTimeKnown">): string {
  const start = new Date(e.startsAt);
  if (e.endsAt && (e.durationDays ?? 1) > 1) {
    return `${shortFmt.format(start)} bis ${dayFmt.format(new Date(e.endsAt))}`;
  }
  if (e.startTimeKnown === false) return `${dayFmt.format(start)}, Uhrzeit offen`;
  return `${dayFmt.format(start)}, ${timeFmt.format(start)} Uhr`;
}

export function formatDuration(e: Pick<MusicEvent, "durationDays" | "kind">): string {
  if (e.durationDays && e.durationDays > 1) return `${e.durationDays} Tage`;
  return e.kind === "festival" ? "Laufzeit unbekannt" : "1 Abend";
}

export function formatDistance(km: number | undefined): string {
  if (km === undefined) return "Entfernung unbekannt";
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

export function formatPrice(p: PriceRange | undefined): string {
  if (!p || (p.min === undefined && p.max === undefined)) return "Preis unbekannt";
  const f = new Intl.NumberFormat("de-DE", { style: "currency", currency: p.currency, maximumFractionDigits: 0 });
  const prefix = p.estimated ? "ca. " : "";
  if (p.min !== undefined && p.max !== undefined && p.min !== p.max) return `${prefix}${f.format(p.min)} bis ${f.format(p.max)}`;
  return `${prefix}ab ${f.format((p.min ?? p.max) as number)}`;
}

export const statusLabel: Record<MusicEvent["status"], string | null> = {
  onsale: null,
  presale: "Vorverkauf",
  soldout: "Ausverkauft",
  cancelled: "Abgesagt",
  postponed: "Verschoben",
  rescheduled: "Neuer Termin",
  offsale: "Kein Verkauf",
  unknown: null,
};

export const sizeLabel: Record<MusicEvent["size"], string> = {
  club: "Club",
  hall: "Halle",
  arena: "Arena",
  "open-air": "Open Air",
  festival: "Festival",
  unknown: "Größe unbekannt",
};

/** "Venue, City · 12 km", leaving out whatever is unknown. Null when nothing is known. */
export function formatPlace(e: Pick<MusicEvent, "venue">, km: number | undefined): string | null {
  const place = [e.venue.name, e.venue.city].filter((x) => x && x.trim()).join(", ");
  const parts = [place, km !== undefined ? formatDistance(km) : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Secondary facts for a card, only the ones that carry information:
 * duration only for multi-day events, size only when not unknown, price only when known.
 */
export function formatFacts(e: Pick<MusicEvent, "durationDays" | "size" | "price">): string | null {
  const parts: string[] = [];
  if (e.durationDays && e.durationDays > 1) parts.push(`${e.durationDays} Tage`);
  if (e.size !== "unknown") parts.push(sizeLabel[e.size]);
  if (e.price && (e.price.min !== undefined || e.price.max !== undefined)) parts.push(formatPrice(e.price));
  return parts.length ? parts.join(" · ") : null;
}
