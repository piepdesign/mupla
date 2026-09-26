import { FilterBarPlaceholder } from "@/components/FilterBarPlaceholder";
import { Shelf } from "@/components/Shelf";
import { sampleRecommendations } from "@/data/sample";

export default function Home() {
  return (
    <>
      <FilterBarPlaceholder />
      <p role="note" className="rounded-card border border-control px-4 py-3 text-sm">
        <strong>Beispieldaten.</strong> Alle Acts und Orte hier sind erfunden. Echte Termine kommen in Etappe 3.
      </p>
      <Shelf id="for-you" title="For You" question="Was passt am besten zu dir?" pair={["acid", "electric"]} items={sampleRecommendations} />
    </>
  );
}
