/** Internal link to the artist page. Names go into the path encoded, the page decodes them. */
export function artistHref(name: string): string {
  return `/artist/${encodeURIComponent(name)}`;
}

/** Last.fm artist page. The URL pattern is visible on last.fm itself (e.g. https://www.last.fm/music/Bonobo); spaces become "+". */
export function lastfmArtistUrl(name: string): string {
  return `https://www.last.fm/music/${encodeURIComponent(name).replace(/%20/g, "+")}`;
}
