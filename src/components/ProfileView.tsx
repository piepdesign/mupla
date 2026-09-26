"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { normalizeName } from "@/domain/normalize";
import { emptyFavorites, parseFavorites, useFavorites, writeFavorites } from "@/lib/favorites";
import { artistHref } from "@/lib/links";
import { EventRows, type EventRow } from "./EventRows";

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

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="display text-[2.5rem] sm:text-[3.5rem]">Mein Profil</h1>
        {username ? (
          <p className="text-fg-muted">
            Hörprofil: <strong className="text-fg">{username}</strong> auf Last.fm. Favoriten liegen nur in diesem Browser.
          </p>
        ) : (
          <p role="status">{setupMessage}</p>
        )}
      </header>

      <section aria-labelledby="neu" className="flex flex-col gap-3">
        <h2 id="neu" className="text-2xl font-bold">
          Neu seit deinem letzten Besuch
        </h2>
        {firstVisit ? (
          <p className="text-fg-muted">Erster Besuch dieser Seite. Ab jetzt merkt sich mupla den Zeitpunkt und zeigt beim nächsten Mal hier, was dazugekommen ist.</p>
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              Seit {dateFmt.format(new Date(previousVisit!))}, für deine favorisierten Artists und Genres. „Neu“ heißt: mupla hat den Termin seitdem zum
              ersten Mal gesehen. Ein echtes Ankündigungsdatum liefert keine der Quellen.
            </p>
            {newRows.length ? (
              <EventRows items={newRows} />
            ) : (
              <p className="text-fg-muted">
                Nichts Neues{favs.artists.length + favs.genres.length === 0 ? ", auch weil du noch keine Artists oder Genres favorisiert hast" : ""}.
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="gemerkt" className="flex flex-col gap-3">
        <h2 id="gemerkt" className="text-2xl font-bold">
          Gemerkte Termine ({favoriteRows.length})
        </h2>
        {favoriteRows.length ? <EventRows items={favoriteRows} /> : <p className="text-fg-muted">Noch keine Termine gemerkt.</p>}
        {missing > 0 && (
          <p className="text-sm text-fg-muted">
            {missing} gemerkte {missing === 1 ? "Termin ist" : "Termine sind"} nicht mehr in den Daten, vermutlich vorbei oder bei der Quelle entfernt.
          </p>
        )}
      </section>

      <section aria-labelledby="artists" className="flex flex-col gap-3">
        <h2 id="artists" className="text-2xl font-bold">
          Favorisierte Artists ({favs.artists.length})
        </h2>
        {favs.artists.length ? (
          <ul className="flex flex-wrap gap-2">
            {favs.artists.map((a) => (
              <li key={a} className="flex items-center rounded border border-border">
                <Link href={artistHref(a)} className="inline-flex min-h-11 items-center px-3 text-sm underline underline-offset-2">
                  {a}
                </Link>
                <button
                  type="button"
                  onClick={() => toggle("artists", a)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center border-l border-border text-sm hover:bg-fg/5"
                >
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">{a} aus den Favoriten entfernen</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted">Artists merkst du auf ihrer Artist-Seite. Die erreichst du über die Namen in den Begründungen.</p>
        )}
      </section>

      <section aria-labelledby="genres" className="flex flex-col gap-3">
        <h2 id="genres" className="text-2xl font-bold">
          Favorisierte Genres ({favs.genres.length})
        </h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-fg-muted">Deine meistgehörten Genres, zum An- und Abwählen:</legend>
          <div className="flex flex-wrap gap-x-4">
            {[...new Set([...topGenres, ...favs.genres])].map((g) => (
              <label key={g} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={has("genres", g)} onChange={() => toggle("genres", g)} className="h-5 w-5" />
                {g}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="sichern" className="flex flex-col gap-3">
        <h2 id="sichern" className="text-2xl font-bold">
          Sichern und übertragen
        </h2>
        <p className="max-w-[70ch] text-sm text-fg-muted">
          Die Favoriten stehen nur im Speicher dieses Browsers. Als JSON kannst du sie sichern oder in einen anderen Browser mitnehmen. Ein Import ersetzt die
          vorhandenen Favoriten.
        </p>
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
      </section>
    </div>
  );
}
