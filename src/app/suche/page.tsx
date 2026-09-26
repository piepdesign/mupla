import { redirect } from "next/navigation";

/** The search lives on the overview now. Old links and bookmarks land there with their query kept. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    for (const x of Array.isArray(v) ? v : v !== undefined ? [v] : []) sp.append(k, x);
  }
  if (!sp.has("q") && !sp.has("genre")) sp.set("focus", "search");
  redirect(`/?${sp.toString()}`);
}
