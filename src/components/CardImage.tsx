"use client";

import { useState } from "react";

/**
 * Provider image with credit line. Falls back to `fallback` (generated art) when the image cannot be
 * loaded, e.g. the provider removed it; a broken image icon would be worse than no photo.
 */
export function CardImage({ src, credit, fallback }: { src: string; credit?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <figure className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="aspect-[2/1] w-full object-cover" />
      {credit && (
        <figcaption className="absolute right-0 bottom-0 max-w-full truncate bg-black/75 px-2 py-0.5 text-xs text-white">
          <span className="sr-only">Bild: </span>
          {credit}
        </figcaption>
      )}
    </figure>
  );
}
