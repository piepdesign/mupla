import type { MusicEvent, Recommendation } from "@/domain/types";
import type { Accent, TextAccent } from "@/design/tokens";
import { AccentSurface } from "./AccentSurface";
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
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const headingId = `shelf-${id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <AccentSurface accent={pair[0]} className="rounded-card px-4 py-5 sm:px-6">
        <h2 id={headingId} className="display text-[2.25rem] sm:text-[3rem]">
          {title}
        </h2>
        <p className="mt-2 text-base font-medium">{question}</p>
      </AccentSurface>
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
