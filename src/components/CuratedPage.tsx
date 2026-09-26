import Link from "next/link";
import type { ViewSlug } from "@/domain/views";
import { getCurationData } from "@/server/curation";
import { homeFromEnv } from "@/server/settings";
import { Dashboard } from "./Dashboard";
import { ViewDetail } from "./ViewDetail";
import { ProviderNotice } from "./ProviderNotice";

/** Server wrapper shared by all views: loads data once, hands candidates to the client curator. */
/** `view` undefined renders the dashboard. */
export async function CuratedPage({ view }: { view?: ViewSlug }) {
  const data = await getCurationData();

  if (!data.ok) {
    return (
      <div role="status" className="flex max-w-[70ch] flex-col gap-3 rounded-card border-2 border-control p-4">
        <h1 className="text-xl font-bold">Noch keine Empfehlungen</h1>
        <p>{data.message}</p>
        <p>
          Im Terminal, im Ordner <code>mupla</code>, die Datei öffnen und die Werte eintragen, dann den Server neu starten:
        </p>
        <pre className="overflow-x-auto rounded bg-bg p-3 text-sm">
          <code>open -e .env.local</code>
        </pre>
        <p className="text-sm text-fg-muted">
          Ohne Profil zeigt <Link href="/debug/events" className="underline underline-offset-2">die Terminliste</Link> trotzdem alle Termine, nur ohne Begründung und Rangfolge.
        </p>
      </div>
    );
  }

  const home = homeFromEnv();
  const props = {
    candidates: data.candidates,
    now: new Date().toISOString(),
    defaultHome: { label: "Gießen", ...home },
    ledgerCreatedAt: data.ledgerCreatedAt,
    profileGenres: data.topTags.map((t) => t.tag),
    allGenres: [...new Set([...data.topTags.map((t) => t.tag), ...data.allGenres])],
  };
  return (
    <>
      <ProviderNotice providers={data.providers} />
      {view === undefined ? (
        <Dashboard {...props} unrelated={data.unrelated} />
      ) : (
        <ViewDetail {...props} view={view} />
      )}
      <p className="text-xs text-fg-muted">
        {data.candidates.length} von {data.totalEvents} geladenen Terminen haben einen Bezug zum Hörprofil von {data.username}.
      </p>
    </>
  );
}
