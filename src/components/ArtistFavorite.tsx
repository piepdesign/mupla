"use client";

import { useFavorites } from "@/lib/favorites";
import { FavoriteToggle } from "./FavoriteToggle";

export function ArtistFavorite({ name }: { name: string }) {
  const { has, toggle } = useFavorites();
  return <FavoriteToggle label={name} state={{ on: has("artists", name), toggle: () => toggle("artists", name) }} />;
}
