"use client";

import { pairFor } from "@/design/tokens";
import { views, viewMeta, type ViewSlug } from "@/domain/views";
import type { Home } from "@/lib/home";
import type { Candidate } from "@/domain/curation";
import type { MusicEvent } from "@/domain/types";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Row } from "./Row";
import { SEARCH_INPUT_ID, SearchPanel } from "./SearchPanel";
import { SectionHeader } from "./SectionHeader";
import { Shelf } from "./Shelf";
import { UnrelatedList } from "./UnrelatedList";
import { SpanSwitch } from "./SpanSwitch";
import { useCuration } from "./useCuration";

export type CurationPageProps = {
  candidates: Candidate[];
  unrelated?: MusicEvent[];
  now: string;
  defaultHome: Home;
  ledgerCreatedAt?: string;
  profileGenres: string[];
  allGenres: string[];
};

/**
 * Start page: every view as one row of tiles, filters apply to all rows at once. Empty rows are named, not shown.
 * With a search term the rows give way to results: cards with a reason first, then "Off Profile".
 */
export function Dashboard(props: CurationPageProps) {
  const c = useCuration(props);
  const params = useSearchParams();

  // The header's search button links here with ?focus=search from other pages.
  useEffect(() => {
    if (params.get("focus") !== "search") return;
    document.getElementById(SEARCH_INPUT_ID)?.focus();
  }, [params]);

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
        resultCount={c.search ? c.search.items.length + c.search.offProfile.length : forYou}
      />
      {c.search ? (
        <>
          <section aria-labelledby="treffer" className="flex flex-col gap-4">
            <SectionHeader id="treffer" title="Results" question="Was zu deiner Suche passt, mit Begründung aus deinem Profil." accent="violet" />
            <Shelf
              id="treffer"
              title="Results"
              question=""
              pair={pairFor("for-you")}
              items={c.search.items}
              showScore={c.showScore}
              favorites={c.favorites}
              headerless
              labelledBy="treffer"
              emptyText="Kein Treffer mit Bezug zu deinem Profil. Was sonst passt, steht darunter."
            />
          </section>
          <UnrelatedList items={c.search.offProfile} />
        </>
      ) : (
        <>
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
      )}
    </>
  );
}
