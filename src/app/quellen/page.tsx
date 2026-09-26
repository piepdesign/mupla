export const metadata = { title: "Quellen und Datenschutz · mupla" };

export default function Sources() {
  return (
    <article className="flex max-w-[70ch] flex-col gap-4">
      <h1 className="display text-[2.5rem]">Quellen</h1>
      <p>Die vollständige Attribution der Datenquellen folgt mit den echten Daten in Etappe 2 und 3.</p>
      <h2 className="text-xl font-bold">Datenschutz</h2>
      <p>
        mupla läuft lokal auf deinem Rechner. Favoriten und Einstellungen liegen nur im Speicher deines Browsers. Anfragen an
        Datenquellen laufen über den lokalen Server, API-Schlüssel verlassen ihn nicht.
      </p>
    </article>
  );
}
