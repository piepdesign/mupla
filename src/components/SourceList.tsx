import { ExternalLink } from "./ExternalLink";

type Via = "native" | "extension" | "none";

/**
 * How streaming services reach mupla. Stage 1 reads taste only from Last.fm; the services below feed it
 * by scrobbling. Checked 2026-09-26 against https://www.last.fm/about/trackmymusic. Direct connectors
 * are not built: Apple Music needs the paid Developer Program, Spotify's dev mode needs Premium,
 * Tidal, YouTube Music and Qobuz have no free history API (see "01 Datenquellen/(C) Musikdienste.md").
 */
const SERVICES: readonly { name: string; via: Via }[] = [
  { name: "Spotify", via: "native" },
  { name: "Tidal", via: "native" },
  { name: "Deezer", via: "native" },
  { name: "SoundCloud", via: "native" },
  { name: "Bandcamp", via: "native" },
  { name: "Apple Music", via: "extension" },
  { name: "YouTube Music", via: "extension" },
  { name: "Qobuz", via: "none" },
];

const VIA_TEXT: Record<Via, string> = {
  native: "Scrobbeln direkt zu Last.fm. Einmal in den Einstellungen des Dienstes verbinden.",
  extension: "Kein direkter Weg. Im Browser über die Erweiterung Web Scrobbler, auf dem Handy über Drittanbieter-Apps.",
  none: "Keine offizielle Verbindung zu Last.fm bekannt, nur über Player wie Roon.",
};

const VIA_BADGE: Record<Via, string> = { native: "Direkt", extension: "Mit Erweiterung", none: "Umweg" };

export function SourceList({ username }: { username?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Last.fm</p>
          <p className="text-sm text-fg-muted">
            {username ? (
              <>
                Verbunden als <strong className="text-fg">{username}</strong>. Grundlage für Profil, Ähnliche und Rewind.
              </>
            ) : (
              "Nicht verbunden. Name und API-Key gehören in .env.local."
            )}
          </p>
        </div>
        {username && (
          <ExternalLink href={`https://www.last.fm/user/${encodeURIComponent(username)}`} context="dein Last.fm-Profil">
            Profil öffnen
          </ExternalLink>
        )}
      </div>
      <div>
        <h3 className="font-semibold">Streamingdienste</h3>
        <p className="text-sm text-fg-muted">
          mupla liest deinen Geschmack aus Last.fm. Was du anderswo hörst, kommt über Scrobbling dort an und zählt dann automatisch mit.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {(Object.keys(VIA_TEXT) as Via[]).map((via) => (
          <li key={via} className="rounded border border-border p-3">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${via === "native" ? "border-fg" : "border-control text-fg-muted"}`}>
                {VIA_BADGE[via]}
              </span>
              <span className="font-medium">
                {SERVICES.filter((s) => s.via === via)
                  .map((s) => s.name)
                  .join(", ")}
              </span>
            </p>
            <p className="mt-1 text-sm text-fg-muted">{VIA_TEXT[via]}</p>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap gap-3 text-sm">
        <ExternalLink href="https://www.last.fm/about/trackmymusic" context="Anleitung bei Last.fm">
          Anleitung bei Last.fm
        </ExternalLink>
        <ExternalLink href="https://github.com/web-scrobbler/web-scrobbler" context="Browser-Erweiterung">
          Web Scrobbler
        </ExternalLink>
      </p>
    </div>
  );
}
