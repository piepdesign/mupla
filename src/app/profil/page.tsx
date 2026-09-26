import type { Metadata } from "next";
import { ProfileView } from "@/components/ProfileView";
import { distanceKm } from "@/domain/scoring";
import { getCurationData } from "@/server/curation";
import { homeFromEnv } from "@/server/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mein Profil · mupla" };

export default async function ProfilePage() {
  const data = await getCurationData();
  const home = homeFromEnv();
  const events = data.ok ? [...data.candidates.map((c) => c.event), ...data.unrelated] : [];
  return (
    <ProfileView
      username={data.ok ? data.username : undefined}
      setupMessage={data.ok ? undefined : data.message}
      events={events.map((event) => ({ event, distanceKm: distanceKm(event, home) }))}
      topGenres={data.ok ? data.topTags.slice(0, 24).map((t) => t.tag) : []}
    />
  );
}
