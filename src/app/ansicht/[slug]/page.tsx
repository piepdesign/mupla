import { notFound } from "next/navigation";
import { CuratedPage } from "@/components/CuratedPage";
import { viewBySlug } from "@/domain/views";

export const dynamic = "force-dynamic";

export default async function ViewPage({ params }: PageProps<"/ansicht/[slug]">) {
  const { slug } = await params;
  const view = viewBySlug(slug);
  if (!view) notFound();
  return <CuratedPage view={view.slug} />;
}
