import Link from "next/link";
import type { MusicEvent, Recommendation } from "@/domain/types";
import type { Accent, TextAccent } from "@/design/tokens";
import { AccentSurface } from "./AccentSurface";
import { EventCard } from "./EventCard";
import { SectionHeader } from "./SectionHeader";
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
      <SectionHeader id={headingId} title={title} question={question} accent={pair[0]}>
        {control}
        <Link href={href} className="inline-flex min-h-11 items-center rounded-full">
          <AccentSurface as="span" accent={pair[0]} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold">
            Alle {items.length}
            <span className="sr-only"> in {title}</span>
            <ArrowRightIcon className="h-4 w-4" />
          </AccentSurface>
        </Link>
      </SectionHeader>
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
