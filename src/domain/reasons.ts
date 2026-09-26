import type { GenreSource, Reason } from "./types";

/** A reason rendered as text segments; `strong` segments are the data anchors. */
/** `artist` marks segments that name an artist, so the UI can link them to the artist page. */
export type ReasonSegment = { text: string; strong?: boolean; artist?: boolean };

const nf = new Intl.NumberFormat("de-DE");

/** Display name of a genre source. Provider ids come from SourceRef.provider. */
export function genreSourceLabel(source: GenreSource): string {
  if (source === "ticketmaster") return "Ticketmaster";
  if (source === "eventfrog") return "Eventfrog";
  if (source === "curated") return "Deine Liste";
  if (source.startsWith("ics:")) return "Der Venue-Kalender";
  return "Die Quelle";
}

/**
 * First half of a genre reason, naming where the genre comes from, so it can be checked on the
 * ticket page (provider) or on Last.fm (listener tags).
 */
function genreClaim(r: { tag: string; artist?: string; source: GenreSource }): ReasonSegment[] {
  const tag: ReasonSegment = { text: r.tag, strong: true };
  if (r.source === "lastfm") {
    return r.artist
      ? [{ text: "Auf Last.fm ist " }, { text: r.artist, strong: true, artist: true }, { text: " als " }, tag, { text: " getaggt" }]
      : [{ text: "Auf Last.fm als " }, tag, { text: " getaggt" }];
  }
  const who = genreSourceLabel(r.source);
  return r.artist
    ? [{ text: `${who} führt ` }, { text: r.artist, strong: true, artist: true }, { text: " unter " }, tag]
    : [{ text: `${who} führt diesen Termin unter ` }, tag];
}

/** Text patterns from "00 Konzept/(C) Ansichten & Filter.md". */
export function renderReason(r: Reason): ReasonSegment[] {
  switch (r.type) {
    case "direct-artist":
      return [{ text: "Weil du " }, { text: r.artist, strong: true, artist: true }, { text: ` ${nf.format(r.plays)}-mal gehört hast.` }];
    case "similar-artist":
      return [
        { text: "Weil " },
        { text: r.artist, strong: true, artist: true },
        { text: " deinem oft gehörten " },
        { text: r.via, strong: true, artist: true },
        { text: " nahesteht." },
      ];
    case "lineup-match":
      return [
        { text: `${r.count} ${r.count === 1 ? "Act" : "Acts"} aus deinem Profil ${r.count === 1 ? "steht" : "stehen"} im Line-up, darunter ` },
        { text: r.examples[0] ?? "", strong: true, artist: true },
        { text: "." },
      ];
    case "genre-match":
      return [...genreClaim(r), { text: ", eines deiner meistgehörten Genres." }];
    case "adjacent-genre":
      return [...genreClaim(r), { text: ". Das grenzt an dein Profil an (über " }, { text: r.via, strong: true }, { text: ")." }];
    case "dormant-artist":
      return [
        { text: "" },
        { text: r.artist, strong: true, artist: true },
        { text: ` war ${r.period} in deinen Top 20, seitdem nicht mehr.` },
      ];
  }
}

export function reasonToString(r: Reason): string {
  return renderReason(r)
    .map((s) => s.text)
    .join("");
}
