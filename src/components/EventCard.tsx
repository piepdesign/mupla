import type { Recommendation } from "@/domain/types";
import type { Accent, TextAccent } from "@/design/tokens";
import { renderReason } from "@/domain/reasons";
import { formatDistance, formatDuration, formatEventDate, formatPrice, sizeLabel, statusLabel } from "@/lib/format";
import { FavoriteToggle } from "./FavoriteToggle";
import { GeneratedArt } from "./GeneratedArt";

/**
 * Field order is fixed by the design direction:
 * date, name, place + distance, duration, price, up to three genres, reason, favourite, ticket link.
 */
export function EventCard({ rec, pair }: { rec: Recommendation; pair: readonly [TextAccent, Accent] }) {
  const { event: e } = rec;
  const status = statusLabel[e.status];
  const headingId = `ev-${e.id}-title`;

  return (
    <article aria-labelledby={headingId} className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
      {e.imageUrl ? (
        // Provider images vary in quality; the card must work without them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <GeneratedArt pair={pair} label={e.title} />
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="tabular text-sm text-fg-muted">
          <time dateTime={e.startsAt}>{formatEventDate(e)}</time>
          {status && (
            <span className="ml-2 inline-block rounded border border-control px-1.5 text-xs font-semibold uppercase tracking-wide text-fg">
              {status}
            </span>
          )}
        </p>

        <h3 id={headingId} className="text-xl leading-tight font-bold">
          {e.title}
        </h3>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="sr-only">Ort</dt>
          <dd className="col-span-2">
            {e.venue.name}, {e.venue.city}
            <span className="tabular text-fg-muted"> · {formatDistance(rec.distanceKm)}</span>
          </dd>
          <dt className="text-fg-muted">Dauer</dt>
          <dd className="tabular">
            {formatDuration(e)} · {sizeLabel[e.size]}
            {e.sizeEstimated && <span className="text-fg-muted"> (geschätzt)</span>}
          </dd>
          <dt className="text-fg-muted">Preis</dt>
          <dd className="tabular">{formatPrice(e.price)}</dd>
        </dl>

        {e.genres.length > 0 && (
          <ul aria-label="Genres" className="flex flex-wrap gap-1.5">
            {e.genres.slice(0, 3).map((g) => (
              <li key={g} className="rounded border border-border px-2 py-0.5 text-xs text-fg-muted">
                {g}
              </li>
            ))}
          </ul>
        )}

        {/* The reason is the point of mupla: same visual weight as the name, never a footnote. */}
        <div className="border-l-4 border-focus pl-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Warum hier</p>
          {rec.reasons.map((r, i) => (
            <p key={i} className="text-lg leading-snug">
              {renderReason(r).map((s, j) =>
                s.strong ? (
                  <strong key={j} className="font-bold">
                    {s.text}
                  </strong>
                ) : (
                  <span key={j}>{s.text}</span>
                ),
              )}
            </p>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <FavoriteToggle label={e.title} />
          {e.officialTicketUrl && (
            <a
              href={e.officialTicketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded bg-fg px-4 text-sm font-semibold text-bg hover:opacity-90"
            >
              Tickets
              <span aria-hidden="true">↗</span>
              <span className="sr-only"> für {e.title} (offizieller Verkauf, externer Link, neuer Tab)</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
