import type { Metadata } from "next";
import { getTasteProfile, PROFILE_LIMITS, PROFILE_TTL } from "@/server/profile";

export const metadata: Metadata = { title: "Profil (Debug) · mupla" };
export const dynamic = "force-dynamic";

const pct = (n: number) => `${Math.round(n * 100)} %`;

/** Deliberately plain: complete over pretty. */
export default async function ProfileDebug({ searchParams }: PageProps<"/debug/profil">) {
  const sp = await searchParams;
  const user = (typeof sp.user === "string" && sp.user) || process.env.LASTFM_USERNAME;
  if (!user) {
    return <p>Kein Last.fm-Name. Trag <code>LASTFM_USERNAME</code> in <code>.env.local</code> ein oder hänge <code>?user=NAME</code> an die Adresse.</p>;
  }

  let result;
  try {
    result = await getTasteProfile(user, { musicbrainz: sp.mb !== "0" });
  } catch (e) {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Profil konnte nicht gebaut werden</h1>
        <p>{(e as Error).message}</p>
      </div>
    );
  }
  const { profile: p, diagnostics: d } = result;

  return (
    <div className="flex flex-col gap-8 text-sm [&_table]:w-full [&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_td]:pr-3 [&_th]:py-1 [&_th]:pr-3 [&_th]:text-left">
      <header>
        <h1 className="text-2xl font-bold">Hörprofil von {p.username}</h1>
        <p className="text-fg-muted">
          Gebaut {new Date(p.builtAt).toLocaleString("de-DE")} in {d.builtIn}, Cache {PROFILE_TTL / 3_600_000} h. MusicBrainz: {d.mbResolved} von {d.mbAttempted} aufgelöst.
          tag.getSimilar: {d.tagGetSimilarWorked ? "funktioniert" : "leer, Ersatzweg aktiv"}. Jahresaggregation:{" "}
          {d.yearAggregationHonoured === null ? "nicht geprüft" : d.yearAggregationHonoured ? "wie angefragt" : "abweichend"}.
        </p>
        <p className="text-fg-muted">Grenzen: {Object.entries(PROFILE_LIMITS).map(([k, v]) => `${k} ${v}`).join(", ")}</p>
        {d.warnings.length > 0 && (
          <ul role="alert" className="mt-2 list-disc pl-5">
            {d.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
      </header>

      <section aria-labelledby="h-top">
        <h2 id="h-top" className="text-xl font-bold">Top-Artists ({p.topArtists.length})</h2>
        <table>
          <thead><tr><th>#</th><th>Artist</th><th>Gewicht</th><th>Plays</th><th>MBID</th><th>Genres</th></tr></thead>
          <tbody>
            {p.topArtists.map((t, i) => (
              <tr key={t.artist.id}>
                <td className="tabular">{i + 1}</td><td>{t.artist.name}</td><td className="tabular">{t.weight.toFixed(3)}</td>
                <td className="tabular">{t.plays}</td><td className="font-mono text-xs">{t.artist.mbid ?? "unbekannt"}</td><td>{t.artist.genres.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="h-tags">
        <h2 id="h-tags" className="text-xl font-bold">Genres ({p.topTags.length})</h2>
        <table>
          <thead><tr><th>Tag</th><th>Gewicht</th></tr></thead>
          <tbody>{p.topTags.slice(0, 60).map((t) => <tr key={t.tag}><td>{t.tag}</td><td className="tabular">{pct(t.weight)}</td></tr>)}</tbody>
        </table>
      </section>

      <section aria-labelledby="h-adj">
        <h2 id="h-adj" className="text-xl font-bold">Nachbar-Artists ({p.adjacentArtists.length})</h2>
        <table>
          <thead><tr><th>Artist</th><th>über</th><th>Match</th></tr></thead>
          <tbody>{p.adjacentArtists.slice(0, 100).map((a) => <tr key={a.artist.id}><td>{a.artist.name}</td><td>{a.via}</td><td className="tabular">{pct(a.match)}</td></tr>)}</tbody>
        </table>
      </section>

      <section aria-labelledby="h-adjtags">
        <h2 id="h-adjtags" className="text-xl font-bold">Nachbar-Genres ({p.adjacentTags.length})</h2>
        <table>
          <thead><tr><th>Genre</th><th>über</th><th>Herkunft</th></tr></thead>
          <tbody>{p.adjacentTags.map((t) => <tr key={t.tag}><td>{t.tag}</td><td>{t.via}</td><td>{t.method}</td></tr>)}</tbody>
        </table>
      </section>

      <section aria-labelledby="h-dormant">
        <h2 id="h-dormant" className="text-xl font-bold">Ruhende Artists, Grundlage für „Wiedersehen“ ({p.dormantArtists.length})</h2>
        <table>
          <thead><tr><th>Artist</th><th>zuletzt in den Top 20</th><th>Plays in dem Jahr</th></tr></thead>
          <tbody>{p.dormantArtists.map((a) => <tr key={a.artist.id}><td>{a.artist.name}</td><td className="tabular">{a.lastHeavyPeriod}</td><td className="tabular">{a.plays}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
