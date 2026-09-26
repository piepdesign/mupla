import type { MusicEvent } from "@/domain/types";
import { EventRows } from "./EventRows";
import { SectionHeader } from "./SectionHeader";

const MAX = 60;

/**
 * Search hits with no or too weak a relation to the listening profile. They get no card and no rank,
 * because a card needs a true reason and there is none. Deliberately plain rows.
 */
export function UnrelatedList({ items, active }: { items: { event: MusicEvent; distanceKm?: number }[]; active: boolean }) {
  return (
    <section aria-labelledby="ohne-profilbezug" className="flex flex-col gap-3">
      <SectionHeader
        id="ohne-profilbezug"
        title="Off Profile"
        question="Passt zur Suche, aber zu wenig zu deinem Hörprofil für eine Empfehlung. Darum ohne Begründung und ohne Rangfolge, nur nach Datum."
        accent="amber"
      />
      {!active ? (
        <p className="text-fg-muted">Gib einen Suchbegriff ein oder wähle ein Genre, dann erscheinen hier auch Termine außerhalb deines Profils.</p>
      ) : items.length === 0 ? (
        <p className="text-fg-muted">Keine weiteren Treffer.</p>
      ) : (
        <EventRows items={items.slice(0, MAX)} />
      )}
      {items.length > MAX && <p className="text-sm text-fg-muted">{items.length - MAX} weitere Treffer, bitte die Suche eingrenzen.</p>}
    </section>
  );
}
