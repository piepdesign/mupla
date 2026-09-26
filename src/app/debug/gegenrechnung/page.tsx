import type { Metadata } from "next";
import { applyView } from "@/domain/curation";
import { crossCheck } from "@/domain/crosscheck";
import { WEIGHTS } from "@/domain/scoring";
import { DEFAULT_FILTERS } from "@/domain/filters";
import { getCurationData } from "@/server/curation";
import { homeFromEnv } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gegenrechnung · mupla" };

const f = (n: number) => n.toFixed(3).replace(".", ",");
const LABELS: Record<keyof typeof WEIGHTS, string> = {
  profileMatch: "Profilnähe",
  reachability: "Erreichbarkeit",
  timing: "Zeitnähe",
  discovery: "Entdeckung",
  priceFriction: "Preisreibung",
};

/** Stage 6 acceptance: the top ten "For You" recommendations with default settings, each reason checked against its match. */
export default async function CrossCheckPage() {
  const data = await getCurationData();
  if (!data.ok) return <p role="status">{data.message}</p>;
  const ctx = { home: homeFromEnv(), discoveryLevel: DEFAULT_FILTERS.discovery / 100, now: new Date(), ledgerCreatedAt: data.ledgerCreatedAt };
  const items = applyView("for-you", data.candidates, ctx).items.slice(0, 10);
  const byId = new Map(data.candidates.map((c) => [c.event.id, c.match]));
  const results = items.map((rec) => ({ rec, checks: crossCheck(rec, byId.get(rec.event.id)!) }));
  const failed = results.flatMap((r) => r.checks).filter((c) => !c.ok).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="display text-[2.5rem]">Gegenrechnung</h1>
      <p>
        Die {items.length} besten Empfehlungen aus „For You“ mit Standardeinstellungen (Entdeckung {DEFAULT_FILTERS.discovery} %, Heimatort aus .env.local).
        Ergebnis: <strong>{failed === 0 ? "alle Prüfungen bestanden" : `${failed} Prüfung(en) nicht bestanden`}</strong>.
      </p>
      <ol className="flex flex-col gap-6">
        {results.map(({ rec, checks }, i) => (
          <li key={rec.event.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
            <h2 className="text-lg font-bold">
              {i + 1}. {rec.event.title}, {rec.event.venue.city}
            </h2>
            <table className="tabular text-left text-sm">
              <caption className="sr-only">Score-Bestandteile</caption>
              <thead className="text-fg-muted">
                <tr>
                  <th scope="col" className="pr-4 font-normal">Bestandteil</th>
                  <th scope="col" className="pr-4 font-normal">Wert</th>
                  <th scope="col" className="pr-4 font-normal">Gewicht</th>
                  <th scope="col" className="font-normal">Beitrag</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => {
                  const sign = k === "priceFriction" ? -1 : 1;
                  return (
                    <tr key={k}>
                      <th scope="row" className="pr-4 font-normal">{LABELS[k]}</th>
                      <td className="pr-4">{f(rec.components[k])}</td>
                      <td className="pr-4">{sign < 0 ? "−" : ""}{f(WEIGHTS[k])}</td>
                      <td>{f(sign * WEIGHTS[k] * rec.components[k])}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <th scope="row">Score</th>
                  <td colSpan={2} />
                  <td>{f(rec.score)}</td>
                </tr>
              </tbody>
            </table>
            <ul className="flex flex-col gap-1 text-sm">
              {checks.map((c, j) => (
                <li key={j}>
                  <strong>{c.ok ? "stimmt" : "FEHLER"}</strong>: {c.label} ({c.detail})
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
