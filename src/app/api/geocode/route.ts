import { geocodePlace } from "@/server/geocode";

/** Home location lookup for the search panel. Keeps the Nominatim call (and its User-Agent) on the server. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) return Response.json({ error: "Bitte einen Ort eingeben." }, { status: 400 });
  try {
    const hit = await geocodePlace(q);
    return hit ? Response.json(hit) : Response.json({ error: `„${q}“ nicht gefunden.` }, { status: 404 });
  } catch {
    return Response.json({ error: "Ortssuche gerade nicht erreichbar." }, { status: 502 });
  }
}
