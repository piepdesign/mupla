import { ExternalLink } from "./ExternalLink";

/**
 * Where the taste profile comes from. Only Last.fm is wired in stage 1; the list says honestly how
 * other services reach mupla (details filled in after the connector research).
 */
export function SourceList({ username }: { username?: string }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      <li className="flex flex-wrap items-center justify-between gap-3 py-3">
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
      </li>
    </ul>
  );
}
