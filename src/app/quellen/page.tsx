export const metadata = { title: "Quellen und Datenschutz · mupla" };

const ext = { target: "_blank", rel: "noopener noreferrer", className: "underline underline-offset-2" } as const;
const newTab = <span className="sr-only"> (externer Link, neuer Tab)</span>;

export default function Sources() {
  return (
    <article className="flex max-w-[70ch] flex-col gap-4">
      <h1 className="display text-[2.5rem]">Quellen</h1>

      <section aria-labelledby="q-profil" className="flex flex-col gap-2">
        <h2 id="q-profil" className="text-xl font-bold">Hörprofil</h2>
        <p>
          <a href="https://www.last.fm" {...ext}>powered by AudioScrobbler{newTab}</a>. Hörprofil, ähnliche Artists und Tags kommen
          aus der Last.fm API, nur für nichtkommerzielle Nutzung. Artist-Links führen auf die jeweilige Last.fm-Katalogseite.
        </p>
        <p>
          Genre-Daten und Artist-IDs: <a href="https://musicbrainz.org" {...ext}>MusicBrainz{newTab}</a>. Kerndaten CC0, Genres und
          Tags unter{" "}
          <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" {...ext}>CC BY-NC-SA 3.0{newTab}</a>.
        </p>
      </section>

      <section aria-labelledby="q-events" className="flex flex-col gap-2">
        <h2 id="q-events" className="text-xl font-bold">Termine</h2>
        <p>
          Eventdaten: <a href="https://www.ticketmaster.de" {...ext}>Ticketmaster{newTab}</a> Discovery API. Ticketlinks führen auf den
          offiziellen Verkauf. Clubkonzerte sind unvollständig, weil es für Eventim, Reservix und Resident Advisor keine freie
          Schnittstelle gibt.
        </p>
        <p>
          Ortskoordinaten für Venues ohne eigene Angabe: Nominatim, Daten ©{" "}
          <a href="https://www.openstreetmap.org/copyright" {...ext}>OpenStreetMap-Mitwirkende, ODbL{newTab}</a>.
        </p>
      </section>

      <section aria-labelledby="q-schrift" className="flex flex-col gap-2">
        <h2 id="q-schrift" className="text-xl font-bold">Schriften</h2>
        <p>Uncut Sans (Kasper Nordkvist) und Archivo (Omnibus-Type), beide SIL Open Font License 1.1, lokal eingebunden.</p>
      </section>

      <section aria-labelledby="q-ds" className="flex flex-col gap-2">
        <h2 id="q-ds" className="text-xl font-bold">Datenschutz</h2>
        <p>
          mupla läuft lokal auf deinem Rechner. Favoriten und Einstellungen liegen nur im Speicher deines Browsers. Anfragen an
          die Datenquellen laufen über den lokalen Server, API-Schlüssel verlassen ihn nicht. Abgerufene Daten werden im Ordner
          <code> .cache/</code> auf deinem Rechner zwischengespeichert und laufen nach Stunden bis Tagen ab.
        </p>
      </section>
    </article>
  );
}
