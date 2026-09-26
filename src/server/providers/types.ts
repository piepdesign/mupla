import type { MusicEvent } from "@/domain/types";
import type { LatLon } from "@/lib/geo";

/** What curation asks the event layer for. Providers decide how to fulfil it. */
export type EventQuery = {
  center: LatLon;
  radiusKm: number;
  /** Artist names from the profile, for artist-centred searches beyond the radius. */
  artists: string[];
  from: Date;
  to: Date;
};

export type ProviderResult = { events: MusicEvent[]; warnings: string[] };

export interface EventProvider {
  id: string;
  label: string;
  /** false when the provider is not configured (e.g. key missing); it is then skipped and reported. */
  isConfigured(): boolean;
  fetchEvents(q: EventQuery): Promise<ProviderResult>;
}

export type ProviderStatus = {
  id: string;
  label: string;
  state: "ok" | "failed" | "not-configured";
  count: number;
  message?: string;
  warnings: string[];
};
