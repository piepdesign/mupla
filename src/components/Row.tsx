import Link from "next/link";
import type { MusicEvent, Recommendation } from "@/domain/types";
import type { Accent, TextAccent } from "@/design/tokens";
import { EventCard } from "./EventCard";
import { ArrowRightIcon } from "./icons";

const TILES = 10;

/**
 * One dashboard row: heading with the view's question, a horizontal strip of tiles, and a link into the full view.
 * The strip scrolls sideways; tabbing through the tiles scrolls it along, so it needs no own focus stop.
 */
export function Row({
  id,
  title,
  question,
  href,
  pair,
  items,
  note,
  showScore,
  favorites,
  control,
}: {
  id: string;
  title: string;
  question: string;
  href: string;
  pair: readonly [TextAccent, Accent];
  items: Recommendation[];
  note?: string;
  showScore: boolean;
  favorites: { isOn: (e: MusicEvent) => boolean; toggle: (e: MusicEvent) => void };
  control?: React.ReactNode;
}) {
  const headingId = `row-${id}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <span aria-hidden="true" className="h-4 w-4 shrink-0 self-center rounded-full ring-1 ring-border" style={{ background: `var(--${pair[0]})` }} />
          <div>
            <h2 id={headingId} className="display text-[1.75rem] sm:text-[2rem]">
              {title}
            </h2>
            <p className="text-sm text-fg-muted">{question}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {control}
          <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 rounded px-3 text-sm font-semibold hover:bg-fg/5">
            Alle {items.length}
            <span className="sr-only"> in {title}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {note && <p className="max-w-[75ch] text-xs text-fg-muted">{note}</p>}
      <ul className="relative -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {items.slice(0, TILES).map((rec) => (
          <li key={rec.event.id} className="w-[18rem] shrink-0 snap-start sm:w-[20rem]">
            <EventCard rec={rec} pair={pair} showScore={showScore} favorite={{ on: favorites.isOn(rec.event), toggle: () => favorites.toggle(rec.event) }} />
          </li>
        ))}
      </ul>
    </section>
  );
}
