"use client";

import { useState } from "react";
import Link from "next/link";
import { pairFor } from "@/design/tokens";
import { viewMeta, type ViewSlug } from "@/domain/views";
import type { MusicEvent } from "@/domain/types";
import { applyFilters } from "@/domain/filters";
import { haversineKm } from "@/lib/geo";
import type { CurationPageProps } from "./Dashboard";
import { ArrowLeftIcon } from "./icons";
import { SearchPanel } from "./SearchPanel";
import { SectionHeader } from "./SectionHeader";
import { Shelf } from "./Shelf";
import { SpanSwitch } from "./SpanSwitch";
import { UnrelatedList } from "./UnrelatedList";
import { useCuration } from "./useCuration";

const PAGE = 30;

/** One view in full: same search panel as the dashboard, all matches as a grid. Also serves the search page. */
export function ViewDetail({
  view,
  unrelated,
  heading,
  ...props
}: CurationPageProps & {
  view: ViewSlug;
  /** Search page only: events without profile relation, listed separately and without ranking. */
  unrelated?: MusicEvent[];
  heading?: { label: string; question: string };
}) {
  const c = useCuration(props);
  const [limit, setLimit] = useState(PAGE);
  const result = c.run(view);
  const meta = heading ?? viewMeta(view, c.filters.span);
  const f = c.filters;

  const unrelatedHits = (() => {
    // Without a query the list would be the whole event pool; it is meant for finding, not browsing.
    if (!unrelated || (!f.q && !f.genres.length)) return [];
    const withDistance = unrelated.map((event) => ({
      event,
      distanceKm: event.venue.lat !== undefined && event.venue.lon !== undefined ? haversineKm(c.home, { lat: event.venue.lat, lon: event.venue.lon }) : undefined,
    }));
    return applyFilters(withDistance, f).sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt));
  })();

  return (
    <>
      <Link href={`/${c.query}`} className="inline-flex min-h-11 items-center gap-2 self-start rounded px-2 text-sm font-medium hover:bg-fg/5">
        <ArrowLeftIcon className="h-4 w-4" />
        Übersicht
      </Link>
      <SectionHeader id="view-title" title={meta.label} question={meta.question} accent={pairFor(view)[0]} level={1}>
        {view === "timeframe" && !heading ? <SpanSwitch value={f.span} onChange={(span) => c.updateFilters({ ...f, span })} /> : null}
      </SectionHeader>
      <SearchPanel
        filters={f}
        onChange={(nf) => {
          c.updateFilters(nf);
          setLimit(PAGE);
        }}
        home={c.home}
        onHomeChange={c.setHome}
        showScore={c.showScore}
        onShowScoreChange={c.setShowScore}
        profileGenres={props.profileGenres}
        allGenres={props.allGenres}
        resultCount={result.items.length + unrelatedHits.length}
      />
      <Shelf
        id={view}
        title={meta.label}
        question={meta.question}
        pair={pairFor(view)}
        items={result.items}
        note={result.note}
        showScore={c.showScore}
        limit={limit}
        favorites={c.favorites}
        headerless
        labelledBy="view-title"
        emptyText={
          view === "favorites"
            ? "Noch nichts gemerkt, oder die Filter blenden deine Favoriten aus. Mit dem Herz an einer Karte landet ein Termin hier."
            : "Für diese Ansicht und diese Filter gibt es keinen Termin mit einer belastbaren Begründung. Lieber leer als aufgefüllt."
        }
        footer={
          result.items.length > limit ? (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="min-h-11 self-start rounded border border-control px-4 text-sm font-medium hover:bg-fg/5">
              {Math.min(PAGE, result.items.length - limit)} weitere zeigen ({result.items.length - limit} übrig)
            </button>
          ) : null
        }
      />
      {unrelated && <UnrelatedList items={unrelatedHits} active={Boolean(f.q || f.genres.length)} />}
    </>
  );
}
