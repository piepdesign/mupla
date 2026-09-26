"use client";

import { pairFor } from "@/design/tokens";
import { views, viewMeta, type ViewSlug } from "@/domain/views";
import type { Home } from "@/lib/home";
import type { Candidate } from "@/domain/curation";
import { Row } from "./Row";
import { SearchPanel } from "./SearchPanel";
import { SpanSwitch } from "./SpanSwitch";
import { useCuration } from "./useCuration";

export type CurationPageProps = {
  candidates: Candidate[];
  now: string;
  defaultHome: Home;
  ledgerCreatedAt?: string;
  profileGenres: string[];
  allGenres: string[];
};

/** Start page: every view as one row of tiles, filters apply to all rows at once. Empty rows are named, not shown. */
export function Dashboard(props: CurationPageProps) {
  const c = useCuration(props);
  const rows = views.map((v) => ({ slug: v.slug as ViewSlug, ...viewMeta(v.slug, c.filters.span), result: c.run(v.slug) }));
  const shown = rows.filter((r) => r.result.items.length > 0);
  const empty = rows.filter((r) => r.result.items.length === 0);
  const forYou = rows[0].result.items.length;

  return (
    <>
      <SearchPanel
        filters={c.filters}
        onChange={c.updateFilters}
        home={c.home}
        onHomeChange={c.setHome}
        showScore={c.showScore}
        onShowScoreChange={c.setShowScore}
        profileGenres={props.profileGenres}
        allGenres={props.allGenres}
        resultCount={forYou}
      />
      {shown.map((r) => (
        <Row
          key={r.slug}
          id={r.slug}
          title={r.label}
          question={r.question}
          href={`${r.slug === "for-you" ? "/ansicht/for-you" : `/ansicht/${r.slug}`}${c.query}`}
          pair={pairFor(r.slug)}
          items={r.result.items}
          note={r.result.note}
          showScore={c.showScore}
          favorites={c.favorites}
          control={r.slug === "timeframe" ? <SpanSwitch value={c.filters.span} onChange={(span) => c.updateFilters({ ...c.filters, span })} /> : undefined}
        />
      ))}
      {empty.length > 0 && (
        <p className="text-sm text-fg-muted">
          Gerade leer mit diesen Filtern: {empty.map((r) => r.label).join(", ")}. Lieber leer als aufgefüllt.
        </p>
      )}
    </>
  );
}
