/**
 * Provider images that must not be hotlinked (Eventfrog: "Do not use these URLs directly in client or
 * frontend applications", API reference 2026-09-26) are downloaded by the local server once, stored
 * under .cache/img/ and served from /api/image. Only hosts listed here are fetched, so the route
 * cannot be used to proxy arbitrary URLs.
 */
const ALLOWED_HOST = /(^|\.)eventfrog\.(net|ch|de|at|it|fr)$/i;

export function isAllowedImageSource(src: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && ALLOWED_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/** Local URL for an allowed remote image, or undefined. */
export function localImageUrl(src: string | undefined): string | undefined {
  return src && isAllowedImageSource(src) ? `/api/image?src=${encodeURIComponent(src)}` : undefined;
}
