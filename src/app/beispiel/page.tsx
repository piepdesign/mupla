import { Shelf } from "@/components/Shelf";
import { sampleRecommendations } from "@/data/sample";

/** Design reference with fictional data (stage 1). Useful without keys. */
export default function Sample() {
  return (
    <>
      <p role="note" className="rounded-card border border-control px-4 py-3 text-sm">
        <strong>Beispieldaten.</strong> Alle Acts und Orte hier sind erfunden. Diese Seite zeigt nur die Gestaltung.
      </p>
      <Shelf id="beispiel" title="Beispiel" question="So sieht ein Regal aus." pair={["acid", "electric"]} items={sampleRecommendations} showScore />
    </>
  );
}
