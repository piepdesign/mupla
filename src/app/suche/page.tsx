import type { Metadata } from "next";
import { CuratedPage } from "@/components/CuratedPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suche · mupla" };

export default function SearchPage() {
  return <CuratedPage view="for-you" search />;
}
