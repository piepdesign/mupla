import { notFound } from "next/navigation";
import { FilterBarPlaceholder } from "@/components/FilterBarPlaceholder";
import { Shelf } from "@/components/Shelf";
import { sampleRecommendations } from "@/data/sample";
import { pairFor } from "@/design/tokens";
import { viewBySlug, views } from "@/domain/views";

export function generateStaticParams() {
  return views.filter((v) => v.slug !== "for-you").map((v) => ({ slug: v.slug }));
}

export default async function ViewPage({ params }: PageProps<"/ansicht/[slug]">) {
  const { slug } = await params;
  const view = viewBySlug(slug);
  if (!view) notFound();
  return (
    <>
      <FilterBarPlaceholder />
      <Shelf id={view.slug} title={view.label} question={view.question} pair={pairFor(view.slug)} items={sampleRecommendations} />
    </>
  );
}
