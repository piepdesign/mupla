import { LastfmError } from "@/server/providers/lastfm";
import { getTasteProfile } from "@/server/profile";

/** GET /api/profile?user=<lastfm name>&mb=0  (user defaults to LASTFM_USERNAME) */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const user = params.get("user")?.trim() || process.env.LASTFM_USERNAME?.trim();
  if (!user) return Response.json({ error: "Kein Last.fm-Name: ?user= setzen oder LASTFM_USERNAME in .env.local eintragen." }, { status: 400 });
  try {
    return Response.json(await getTasteProfile(user, { musicbrainz: params.get("mb") !== "0" }));
  } catch (e) {
    const status = e instanceof LastfmError && (e.code === 6 || e.code === 10) ? 400 : 502;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
