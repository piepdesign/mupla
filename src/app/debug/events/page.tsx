import type { Metadata } from "next";
import { ProviderNotice } from "@/components/ProviderNotice";
import { formatDistance, formatEventDate, formatPrice, sizeLabel, statusLabel } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { getEvents } from "@/server/events";
import { defaultWindow, homeFromEnv, SWEEP_RADIUS_KM } from "@/server/settings";

export const metadata: Metadata = { title: "Termine (Debug) · mupla" };
export const dynamic = "force-dynamic";

/** Stage 3 check: every normalised event, unranked. No reasons yet, so this is a table, not shelves. */
export default async function EventsDebug() {
  const home = homeFromEnv();
  const { events, providers, warnings, builtAt } = await getEvents({ center: home, radiusKm: SWEEP_RADIUS_KM, artists: [], ...defaultWindow() });
  const merged = events.filter((e) => e.sources.length > 1).length;

  return (
    <div className="flex flex-col gap-6 text-sm [&_td]:border-b [&_td]:border-border [&_td]:py-1 [&_td]:pr-3 [&_td]:align-top [&_th]:pr-3 [&_th]:text-left">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Termine, ungefiltert ({events.length})</h1>
        <p className="text-fg-muted">
          Umkreis {SWEEP_RADIUS_KM} km um {home.lat.toFixed(4)}, {home.lon.toFixed(4)}. Stand {new Date(builtAt).toLocaleString("de-DE")}.
          {" "}{merged} Termine aus mehreren Quellen zusammengeführt.
        </p>
        <ul>
          {providers.map((p) => (
            <li key={p.id}>
              {p.label}: {p.state === "ok" ? `${p.count} Termine` : p.message}
              {p.warnings.map((w) => <span key={w} className="block pl-4 text-fg-muted">{w}</span>)}
            </li>
          ))}
        </ul>
        {warnings.map((w) => <p key={w} className="text-fg-muted">{w}</p>)}
      </header>
      <ProviderNotice providers={providers} />
      <table>
        <thead>
          <tr><th>Datum</th><th>Titel</th><th>Ort</th><th>Entfernung</th><th>Art</th><th>Größe</th><th>Preis</th><th>Status</th><th>Genres</th><th>Line-up</th><th>Quellen</th></tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td className="tabular whitespace-nowrap">{formatEventDate(e)}</td>
              <td>{e.title}</td>
              <td>{e.venue.name}, {e.venue.city} ({e.venue.country || "Land unbekannt"})</td>
              <td className="tabular">{formatDistance(e.venue.lat !== undefined && e.venue.lon !== undefined ? haversineKm(home, { lat: e.venue.lat, lon: e.venue.lon }) : undefined)}</td>
              <td>{e.kind}{e.durationDays && e.durationDays > 1 ? `, ${e.durationDays} Tage` : ""}</td>
              <td>{sizeLabel[e.size]}{e.sizeEstimated ? " (geschätzt)" : ""}</td>
              <td className="tabular">{formatPrice(e.price)}</td>
              <td>{statusLabel[e.status] ?? e.status}</td>
              <td>{e.genres.join(", ") || "unbekannt"}</td>
              <td>{e.lineup.map((l) => `${l.artist.name}${l.day ? ` (${l.day}${l.stage ? `, ${l.stage}` : ""})` : ""}`).join(", ")}</td>
              <td>{e.sources.map((s) => s.provider).join(" + ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
