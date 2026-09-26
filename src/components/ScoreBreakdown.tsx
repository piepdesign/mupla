import type { Recommendation } from "@/domain/types";
import { WEIGHTS } from "@/domain/scoring";

const rows: { key: keyof typeof WEIGHTS; label: string; sign: 1 | -1 }[] = [
  { key: "profileMatch", label: "Profilnähe", sign: 1 },
  { key: "reachability", label: "Erreichbarkeit", sign: 1 },
  { key: "timing", label: "Zeitnähe", sign: 1 },
  { key: "discovery", label: "Entdeckungsbonus", sign: 1 },
  { key: "priceFriction", label: "Preisreibung", sign: -1 },
];

const f = (n: number) => n.toFixed(3).replace(".", ",");

/** Debug panel: every score component with its weight, so the ranking can be recalculated by hand. */
export function ScoreBreakdown({ rec }: { rec: Recommendation }) {
  return (
    <details className="rounded border border-border px-3 py-2 text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-medium">Rechenweg</summary>
      <table className="tabular mt-2 w-full text-left">
        <caption className="sr-only">Score-Bestandteile</caption>
        <thead className="text-fg-muted">
          <tr>
            <th scope="col" className="font-normal">Bestandteil</th>
            <th scope="col" className="font-normal">Wert</th>
            <th scope="col" className="font-normal">Gewicht</th>
            <th scope="col" className="font-normal">Beitrag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="font-normal">{r.label}</th>
              <td>{f(rec.components[r.key])}</td>
              <td>{r.sign < 0 ? "−" : ""}{f(WEIGHTS[r.key])}</td>
              <td>{f(r.sign * WEIGHTS[r.key] * rec.components[r.key])}</td>
            </tr>
          ))}
          <tr className="border-t border-border font-semibold">
            <th scope="row">Score</th>
            <td colSpan={2} />
            <td>{f(rec.score)}</td>
          </tr>
        </tbody>
      </table>
    </details>
  );
}
