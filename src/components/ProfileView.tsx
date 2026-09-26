"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { normalizeName } from "@/domain/normalize";
import { emptyFavorites, parseFavorites, useFavorites, writeFavorites } from "@/lib/favorites";
import { artistHref } from "@/lib/links";
import { EventRows, type EventRow } from "./EventRows";
import { SectionHeader } from "./SectionHeader";
import { SourceList } from "./SourceList";
import { Panel } from "./Panel";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });
const byDate = (a: EventRow, b: EventRow) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt);

export function ProfileView({
  username,
  setupMessage,
  events,
  topGenres,
}: {
  username?: string;
  setupMessage?: string;
  events: EventRow[];
  topGenres: string[];
}) {
  const { favs, toggle, has, eventIds } = useFavorites();
  const [previousVisit, setPreviousVisit] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const fileId = useId();

  // "Last visit" means the last time this page was opened. Read the old value once, then store now.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem("mupla-favorites");
    } catch {}
    const cur = (raw && parseFavorites(JSON.parse(raw))) || emptyFavorites();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviousVisit(cur.lastSeenAt);
    writeFavorites({ ...cur, lastSeenAt: new Date().toISOString() });
  }, []);

  const favoriteRows = useMemo(() => events.filter((r) => eventIds.has(r.event.id)).sort(byDate), [events, eventIds]);
  const missing = favs.events.length + favs.festivals.length - favoriteRows.length;

  const firstVisit = previousVisit === null || Date.parse(previousVisit) === 0;
  const newRows = useMemo(() => {
    if (firstVisit || !previousVisit) return [];
    const since = Date.parse(previousVisit);
    const artists = new Set(favs.artists.map(normalizeName));
    const genres = new Set(favs.genres);
    return events
      .filter((r) => r.event.firstSeenAt && Date.parse(r.event.firstSeenAt) > since)
      .map((r): EventRow | null => {
        const artist = r.event.lineup.find((l) => artists.has(normalizeName(l.artist.name)));
        if (artist) return { ...r, note: `Neu mit ${artist.artist.name}, einem deiner favorisierten Artists.` };
        const genre = [...r.event.genres, ...r.event.lineup.flatMap((l) => l.artist.genres)].find((g) => genres.has(g));
        if (genre) return { ...r, note: `Neu im favorisierten Genre ${genre}.` };
        return null;
      })
      .filter((r): r is EventRow => r !== null)
      .sort(byDate);
  }, [events, favs.artists, favs.genres, previousVisit, firstVisit]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(favs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mupla-favoriten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseFavorites(JSON.parse(await file.text()));
      if (!parsed) {
        setImportMsg("Import abgelehnt: Die Datei hat nicht das mupla-Favoritenformat (Version 1).");
        return;
      }
      writeFavorites({ ...parsed, lastSeenAt: new Date().toISOString() });
      const n = parsed.artists.length + parsed.genres.length + parsed.events.length + parsed.festivals.length;
      setImportMsg(`Import erfolgreich: ${n} Favoriten übernommen. Die bisherigen wurden ersetzt.`);
    } catch {
      setImportMsg("Import fehlgeschlagen: Die Datei ist kein gültiges JSON.");
    }
  };

  const genreChoices = [...new Set([...topGenres, ...favs.genres])];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader id="profil-titel" title="Mein Profil" question="Deine Quellen, Favoriten und was neu ist." accent="violet" level={1} />
      {!username && <p role="status">{setupMessage}</p>}

      <Panel id="quellen" title="Connected" accent="acid">
        <SourceList username={username} />
      </Panel>

      <Panel id="neu" title="New for you" accent="coral" hint={firstVisit ? undefined : `Seit deinem letzten Besuch am ${dateFmt.format(new Date(previousVisit!))}`}>
        {firstVisit ? (
          <p className="text-fg-muted">Erster Besuch dieser Seite. Ab jetzt merkt sich mupla den Zeitpunkt und zeigt beim nächsten Mal hier, was für deine Artists und Genres dazugekommen ist.</p>
        ) : newRows.length ? (
          <EventRows items={newRows} />
        ) : (
          <p className="text-fg-muted">
            Nichts Neues{favs.artists.length + favs.genres.length === 0 ? ", auch weil du noch keine Artists oder Genres favorisiert hast" : ""}. „Neu“ heißt: mupla hat den Termin seitdem zum ersten Mal gesehen.
          </p>
        )}
      </Panel>

      <Panel id="gemerkt" title={`Saved (${favoriteRows.length})`} accent="cyan">
        {favoriteRows.length ? <EventRows items={favoriteRows} /> : <p className="text-fg-muted">Noch keine Termine gemerkt. Mit dem Herz an einer Karte landen sie hier.</p>}
        {missing > 0 && (
          <p className="text-sm text-fg-muted">
            {missing} gemerkte {missing === 1 ? "Termin ist" : "Termine sind"} nicht mehr in den Daten, vermutlich vorbei oder bei der Quelle entfernt.
          </p>
        )}
      </Panel>

      <div className="grid gap-8 lg:grid-cols-2">
        <Panel id="artists" title={`Artists (${favs.artists.length})`} accent="amber">
          {favs.artists.length ? (
            <ul className="flex flex-wrap gap-2">
              {favs.artists.map((a) => (
                <li key={a} className="flex items-center rounded-full border border-control">
                  <Link href={artistHref(a)} className="inline-flex min-h-11 items-center rounded-l-full pr-2 pl-4 text-sm font-medium hover:underline">
                    {a}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle("artists", a)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-full text-sm hover:bg-fg/5"
                  >
                    <span aria-hidden="true">✕</span>
                    <span className="sr-only">{a} aus den Favoriten entfernen</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">Artists merkst du auf ihrer Seite. Die öffnest du über die Namen in den Begründungen.</p>
          )}
        </Panel>

        <Panel id="genres" title={`Genres (${favs.genres.length})`} accent="magenta" hint="Deine meistgehörten Genres. Antippen zum Merken.">
          <ul className="flex flex-wrap gap-2">
            {genreChoices.map((g) => {
              const on = has("genres", g);
              return (
                <li key={g}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("genres", g)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
                      on ? "border-fg bg-fg text-bg" : "border-control hover:bg-fg/5"
                    }`}
                  >
                    {on && <span aria-hidden="true">✓</span>}
                    {g}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel id="sichern" title="Backup" accent="violet" hint="Favoriten liegen nur in diesem Browser. Als JSON sicherst du sie oder nimmst sie in einen anderen Browser mit. Ein Import ersetzt die vorhandenen.">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={exportJson} className="min-h-11 rounded bg-fg px-4 text-sm font-semibold text-bg hover:opacity-90">
            Als JSON exportieren
          </button>
          <label htmlFor={fileId} className="inline-flex min-h-11 cursor-pointer items-center rounded border border-control px-4 text-sm font-medium hover:bg-fg/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus">
            JSON importieren
            <input
              id={fileId}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void importJson(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p aria-live="polite" className="text-sm">
          {importMsg}
        </p>
      </Panel>
    </div>
  );
}

