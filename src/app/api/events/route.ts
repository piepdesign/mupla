import { getEvents } from "@/server/events";
import { defaultWindow, homeFromEnv, SWEEP_RADIUS_KM } from "@/server/settings";

/** GET /api/events  Raw normalised events for the sweep radius around home, plus provider status. */
export async function GET() {
  const result = await getEvents({ center: homeFromEnv(), radiusKm: SWEEP_RADIUS_KM, artists: [], ...defaultWindow() });
  return Response.json(result);
}
