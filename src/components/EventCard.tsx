import Link from "next/link";
import type { Recommendation } from "@/domain/types";
import type { Accent, TextAccent } from "@/design/tokens";
import { renderReason } from "@/domain/reasons";
import { formatEventDate, formatFacts, formatPlace, statusLabel } from "@/lib/format";
import { artistHref } from "@/lib/links";
import { ExternalLink } from "./ExternalLink";
import { FavoriteToggle } from "./FavoriteToggle";
import { GeneratedArt } from "./GeneratedArt";
import { ScoreBreakdown } from "./ScoreBreakdown";

/**
 * Field order is fixed by the design direction: date, name, place, facts, genres, reason, favourite, tickets.
 * Unknown facts are left out instead of printed as "unbekannt"; the reason is never left out.
 */
export function EventCard({
  rec,
  pair,
  showScore = false,
  favorite,
}: {
  rec: Recommendation;
  pair: readonly [TextAccent, Accent];
  showScore?: boolean;
  favorite?: { on: boolean; toggle: () => void };
}) {
  const { event: e } = rec;
  const status = statusLabel[e.status];
  const headingId = `ev-${e.id}-title`;
  const place = formatPlace(e, rec.distanceKm);
  const facts = formatFacts(e);

  return (
    <article aria-labelledby={headingId} className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
      {e.imageUrl ? (
        // Provider images vary in quality; the card must work without them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.imageUrl} alt="" className="aspect-[2/1] w-full object-cover" />
      ) : (
        <GeneratedArt pair={pair} label={e.title} />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="tabular text-sm text-fg-muted">
          <time dateTime={e.startsAt}>{formatEventDate(e)}</time>
          {status && (
            <span className="ml-2 inline-block rounded border border-control px-1.5 text-xs font-semibold uppercase tracking-wide text-fg">{status}</span>
          )}
        </p>

        <h3 id={headingId} className="text-lg leading-tight font-bold">
          {e.title}
        </h3>

        {(place || facts) && (
          <p className="text-sm">
            {place}
            {place && facts && <br />}
            {facts && <span className="text-fg-muted">{facts}</span>}
          </p>
        )}

        {/* The reason is the point of mupla: it stays on every card, set apart by the rule, not by a label. */}
        <div className="mt-1 border-l-4 pl-3" style={{ borderColor: `var(--${pair[0]})` }}>
          {rec.reasons.map((r, i) => (
            <p key={i} className="leading-snug">
              {renderReason(r).map((s, j) =>
                s.artist ? (
                  <Link key={j} href={artistHref(s.text)} className="font-bold underline decoration-1 underline-offset-2 hover:decoration-2">
                    {s.text}
                  </Link>
                ) : s.strong ? (
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
          <FavoriteToggle label={e.title} state={favorite} compact />
          {e.officialTicketUrl && (
            <ExternalLink href={e.officialTicketUrl} context={`Tickets für ${e.title}, offizieller Verkauf`} primary>
              Tickets
            </ExternalLink>
          )}
          {e.merchUrl && (
            <ExternalLink href={e.merchUrl} context={`offizieller Merch zu ${e.title}`}>
              Merch
            </ExternalLink>
          )}
        </div>
        {showScore && <ScoreBreakdown rec={rec} />}
      </div>
    </article>
  );
}
