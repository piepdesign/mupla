"use client";

import Link from "next/link";
import type { MusicEvent } from "@/domain/types";
import { formatDistance, formatEventDate, formatPrice, statusLabel } from "@/lib/format";
import { eventFavoriteKind, useFavorites } from "@/lib/favorites";
import { artistHref } from "@/lib/links";
import { ExternalLink } from "./ExternalLink";
import { FavoriteToggle } from "./FavoriteToggle";

export type EventRow = { event: MusicEvent; distanceKm?: number; note?: string };

/** Plain chronological rows: for lists that are not recommendations (search hits without profile relation, artist pages). */
export function EventRows({ items, linkHeadliner = true }: { items: EventRow[]; linkHeadliner?: boolean }) {
  const { has, toggle } = useFavorites();
  return (
    <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
      {items.map(({ event: e, distanceKm, note }) => {
        const head = e.lineup.find((l) => l.role === "headliner") ?? e.lineup[0];
        const kind = eventFavoriteKind(e);
        const status = statusLabel[e.status];
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <time dateTime={e.startsAt} className="tabular w-44 shrink-0 text-sm text-fg-muted">
              {formatEventDate(e)}
            </time>
            <div className="min-w-48 flex-1">
              <p className="font-semibold">
                {e.title}
                {status && <span className="ml-2 rounded border border-control px-1.5 text-xs font-semibold uppercase">{status}</span>}
              </p>
              <p className="text-sm text-fg-muted">
                {e.venue.name}, {e.venue.city} · {formatDistance(distanceKm)} · {formatPrice(e.price)}
                {e.genres.length > 0 && ` · ${e.genres.slice(0, 3).join(", ")}`}
              </p>
              {note && <p className="text-sm">{note}</p>}
            </div>
            {linkHeadliner && head && (
              <Link href={artistHref(head.artist.name)} className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-2">
                {head.artist.name}
              </Link>
            )}
            <FavoriteToggle label={e.title} state={{ on: has(kind, e.id), toggle: () => toggle(kind, e.id) }} />
            {e.officialTicketUrl && (
              <ExternalLink href={e.officialTicketUrl} context={`Tickets für ${e.title}, offizieller Verkauf`}>
                Tickets
              </ExternalLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
