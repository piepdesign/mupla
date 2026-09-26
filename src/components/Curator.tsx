"use client";

import { useEffect, useMemo, useState } from "react";
import { applyView, type Candidate } from "@/domain/curation";
import { pairFor } from "@/design/tokens";
import { viewBySlug, type ViewSlug } from "@/domain/views";
import { HomeSetting, loadHome, saveHome, type Home } from "./HomeSetting";
import { Shelf } from "./Shelf";

const PAGE = 30;

export type CuratorProps = {
  view: ViewSlug;
  candidates: Candidate[];
  now: string;
  defaultHome: Home;
  ledgerCreatedAt?: string;
};

/** Client half of curation: scores the server's candidates for the current settings and renders one shelf. */
export function Curator({ view, candidates, now, defaultHome, ledgerCreatedAt }: CuratorProps) {
  const [home, setHome] = useState<Home>(defaultHome);
  const [showScore, setShowScore] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const meta = viewBySlug(view)!;

  useEffect(() => {
    // localStorage is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHome(loadHome(defaultHome));
  }, [defaultHome]);

  const result = useMemo(
    () => applyView(view, candidates, { home, discoveryLevel: 0.3, now: new Date(now), ledgerCreatedAt }),
    [view, candidates, home, now, ledgerCreatedAt],
  );

  return (
    <>
      <section aria-label="Einstellungen" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
        <HomeSetting
          key={`${home.lat},${home.lon}`}
          home={home}
          onChange={(h) => {
            setHome(h);
            saveHome(h);
          }}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} className="h-5 w-5 accent-current" />
          Rechenweg an jeder Karte zeigen
        </label>
      </section>

      <Shelf
        id={view}
        title={meta.label}
        question={meta.question}
        pair={pairFor(view)}
        items={result.items}
        note={result.note}
        showScore={showScore}
        limit={limit}
        emptyText="Für diese Ansicht gibt es gerade keinen Termin mit einer belastbaren Begründung. Lieber leer als aufgefüllt."
        footer={
          result.items.length > limit ? (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="min-h-11 self-start rounded border border-control px-4 text-sm font-medium hover:bg-fg/5"
            >
              {Math.min(PAGE, result.items.length - limit)} weitere zeigen ({result.items.length - limit} übrig)
            </button>
          ) : null
        }
      />
    </>
  );
}
