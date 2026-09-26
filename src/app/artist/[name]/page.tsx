import type { Metadata } from "next";
import Link from "next/link";
import { artistAppearances, artistHistory } from "@/domain/artist";
import { normalizeGenres, normalizeName } from "@/domain/normalize";
import { TAG_BLOCKLIST } from "@/domain/profile";
import type { MusicEvent } from "@/domain/types";
import { distanceKm } from "@/domain/scoring";
import { ArtistFavorite } from "@/components/ArtistFavorite";
import { EventRows } from "@/components/EventRows";
import { ExternalLink } from "@/components/ExternalLink";
import { getCurationData } from "@/server/curation";
import { getArtistTopTags, getSimilarArtists } from "@/server/providers/lastfm";
import { homeFromEnv } from "@/server/settings";
import { artistHref, lastfmArtistUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("de-DE");

export async function generateMetadata({ params }: PageProps<"/artist/[name]">): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} · mupla` };
}

export default async function ArtistPage({ params }: PageProps<"/artist/[name]">) {
  const { name: raw } = await params;
  const name = decodeURIComponent(raw);
  const data = await getCurationData();

  if (!data.ok) {
    return (
      <div role="status" className="flex max-w-[70ch] flex-col gap-3">
        <h1 className="display text-[2.5rem]">{name}</h1>
        <p>{data.message}</p>
      </div>
    );
  }

  const all: MusicEvent[] = [...data.candidates.map((c) => c.event), ...data.unrelated];
  const app = artistAppearances(all, name);
  const hist = artistHistory(data.profile, name);
  const home = homeFromEnv();

  // Genres: profile first (already normalised), else Last.fm tags (cached 7 days), else the event data.
  let genres = hist.genres;
  let genreSource = "aus deinem Profil";
  if (!genres.length) {
    try {
      genres = normalizeGenres((await getArtistTopTags({ name })).map((t) => t.name).filter((t) => !TAG_BLOCKLIST.has(t))).slice(0, 8);
      genreSource = "Last.fm-Tags";
    } catch {
      genres = [];
    }
  }
  if (!genres.length) {
    genres = [...new Set(all.flatMap((e) => e.lineup.filter((l) => normalizeName(l.artist.name) === normalizeName(name)).flatMap((l) => l.artist.genres)))];
    genreSource = "aus den Termindaten";
  }

  let similar: { name: string; match: number }[] = [];
  let similarError = false;
  try {
    similar = (await getSimilarArtists({ name })).slice(0, 12);
  } catch {
    similarError = true;
  }
  const inProfile = new Set(data.profile.topArtists.map((a) => normalizeName(a.artist.name)));

  const rows = (list: MusicEvent[]) => list.map((event) => ({ event, distanceKm: distanceKm(event, home) }));
  const total = app.ownTour.length + app.guest.length + app.festival.length;

  return (
    <article aria-labelledby="artist-name" className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted">Artist</p>
        <h1 id="artist-name" className="display text-[2.5rem] sm:text-[3.5rem]">
          {name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <ArtistFavorite name={name} />
          <ExternalLink href={lastfmArtistUrl(name)} context={`${name} auf Last.fm`}>
            Auf Last.fm
          </ExternalLink>
        </div>
      </header>

      <section aria-labelledby="hoerhistorie" className="flex flex-col gap-2">
        <h2 id="hoerhistorie" className="text-2xl font-bold">
          Deine Hörhistorie
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {hist.top && (
            <li>
              Platz {hist.top.rank} deiner gewichteten Top-Artists, {nf.format(hist.top.plays)} Scrobbles.
            </li>
          )}
          {hist.dormant && (
            <li>
              War {hist.dormant.period} in deinen Top 20 ({nf.format(hist.dormant.plays)} Scrobbles in dem Jahr), seitdem nicht mehr.
            </li>
          )}
          {hist.similarTo?.map((s) => (
            <li key={s.via}>
              Last.fm nennt {name} ähnlich zu <Link href={artistHref(s.via)} className="underline underline-offset-2">{s.via}</Link> (Ähnlichkeit {Math.round(s.match * 100)} %).
            </li>
          ))}
          {!hist.top && !hist.dormant && !hist.similarTo && <li>In deinem Profil kommt {name} nicht vor.</li>}
        </ul>
      </section>

      <section aria-labelledby="genres" className="flex flex-col gap-2">
        <h2 id="genres" className="text-2xl font-bold">
          Genres
        </h2>
        {genres.length ? (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <li key={g}>
                  <Link href={`/suche?genre=${encodeURIComponent(g)}`} className="inline-flex min-h-11 items-center rounded border border-border px-3 text-sm hover:bg-fg/5">
                    {g}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-sm text-fg-muted">Quelle: {genreSource}. Ein Klick sucht Termine in diesem Genre.</p>
          </>
        ) : (
          <p className="text-fg-muted">Keine Genre-Angaben gefunden.</p>
        )}
      </section>

      <section aria-labelledby="termine" className="flex flex-col gap-4">
        <h2 id="termine" className="text-2xl font-bold">
          Kommende Termine ({total})
        </h2>
        {total === 0 && (
          <p className="text-fg-muted">
            Keine Termine in den geladenen Daten. Gesucht wird im Umkreis von 300 km um dein Zuhause und für Artists aus deinem Profil zusätzlich in den Nachbarländern.
          </p>
        )}
        {(
          [
            ["Eigene Tour", app.ownTour],
            ["Gastauftritt", app.guest],
            ["Festival-Line-up", app.festival],
          ] as const
        ).map(([label, list]) =>
          list.length ? (
            <div key={label} className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">
                {label} ({list.length})
              </h3>
              <EventRows items={rows(list)} linkHeadliner={label !== "Eigene Tour"} />
            </div>
          ) : null,
        )}
      </section>

      <section aria-labelledby="aehnliche" className="flex flex-col gap-2">
        <h2 id="aehnliche" className="text-2xl font-bold">
          Ähnliche Artists
        </h2>
        {similarError ? (
          <p className="text-fg-muted">Last.fm war gerade nicht erreichbar.</p>
        ) : similar.length ? (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {similar.map((s) => (
                <li key={s.name}>
                  <Link href={artistHref(s.name)} className="inline-flex min-h-11 items-center gap-1 rounded border border-border px-3 text-sm hover:bg-fg/5">
                    {s.name}
                    {inProfile.has(normalizeName(s.name)) && <span className="text-fg-muted">(hörst du)</span>}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-sm text-fg-muted">Quelle: Last.fm artist.getSimilar, nach Ähnlichkeit sortiert.</p>
          </>
        ) : (
          <p className="text-fg-muted">Last.fm kennt keine ähnlichen Artists.</p>
        )}
      </section>
    </article>
  );
}
