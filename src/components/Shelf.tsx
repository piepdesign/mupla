import type { MusicEvent, Recommendation } from "@/domain/types";
import type { Accent, TextAccent } from "@/design/tokens";
import { SectionHeader } from "./SectionHeader";
import { EventCard } from "./EventCard";

/** A shelf is a labelled list, not a stack of divs. */
export function Shelf({
  id,
  title,
  question,
  pair,
  items,
  emptyText = "Hier ist gerade nichts.",
  note,
  showScore = false,
  limit,
  favorites,
  footer,
  control,
  headerless = false,
  labelledBy,
}: {
  id: string;
  title: string;
  question: string;
  pair: readonly [TextAccent, Accent];
  items: Recommendation[];
  emptyText?: string;
  note?: string;
  showScore?: boolean;
  limit?: number;
  favorites?: { isOn: (e: MusicEvent) => boolean; toggle: (e: MusicEvent) => void };
  footer?: React.ReactNode;
  control?: React.ReactNode;
  /** The page renders the heading itself (above the search panel); the list stays labelled by `labelledBy`. */
  headerless?: boolean;
  labelledBy?: string;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const headingId = `shelf-${id}`;
  return (
    <section aria-labelledby={labelledBy ?? headingId} className="flex flex-col gap-4">
      {headerless ? null : (
        <SectionHeader id={headingId} title={title} question={question} accent={pair[0]} level={1}>
          {control}
        </SectionHeader>
      )}
      {note && <p className="max-w-[75ch] text-sm text-fg-muted">{note}</p>}
      {items.length === 0 ? (
        <p className="text-fg-muted">{emptyText}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((rec) => (
            <li key={rec.event.id}>
              <EventCard
                rec={rec}
                pair={pair}
                showScore={showScore}
                favorite={favorites ? { on: favorites.isOn(rec.event), toggle: () => favorites.toggle(rec.event) } : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}
