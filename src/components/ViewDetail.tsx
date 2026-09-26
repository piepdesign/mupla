"use client";

import { useState } from "react";
import Link from "next/link";
import { pairFor } from "@/design/tokens";
import { viewMeta, type ViewSlug } from "@/domain/views";
import type { CurationPageProps } from "./Dashboard";
import { ArrowLeftIcon } from "./icons";
import { SearchPanel } from "./SearchPanel";
import { SectionHeader } from "./SectionHeader";
import { Shelf } from "./Shelf";
import { SpanSwitch } from "./SpanSwitch";
import { useCuration } from "./useCuration";

const PAGE = 30;

/** One view in full: same search panel as the dashboard, all matches as a grid. */
export function ViewDetail({ view, ...props }: CurationPageProps & { view: ViewSlug }) {
  const c = useCuration(props);
  const [limit, setLimit] = useState(PAGE);
  const result = c.run(view);
  const meta = viewMeta(view, c.filters.span);
  const f = c.filters;

  return (
    <>
      <Link href={`/${c.query}`} className="inline-flex min-h-11 items-center gap-2 self-start rounded px-2 text-sm font-medium hover:bg-fg/5">
        <ArrowLeftIcon className="h-4 w-4" />
        Übersicht
      </Link>
      <SectionHeader id="view-title" title={meta.label} question={meta.question} accent={pairFor(view)[0]} level={1}>
        {view === "timeframe" ? <SpanSwitch value={f.span} onChange={(span) => c.updateFilters({ ...f, span })} /> : null}
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
        resultCount={result.items.length}
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
    </>
  );
}
