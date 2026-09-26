import type { Recommendation } from "@/domain/types";
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
}: {
  id: string;
  title: string;
  question: string;
  pair: readonly [TextAccent, Accent];
  items: Recommendation[];
  emptyText?: string;
}) {
  const headingId = `shelf-${id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <AccentSurface accent={pair[0]} className="rounded-card px-4 py-5 sm:px-6">
        <h2 id={headingId} className="display text-[2.25rem] sm:text-[3rem]">
          {title}
        </h2>
        <p className="mt-2 text-base font-medium">{question}</p>
      </AccentSurface>
      {items.length === 0 ? (
        <p className="text-fg-muted">{emptyText}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((rec) => (
            <li key={rec.event.id}>
              <EventCard rec={rec} pair={pair} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
