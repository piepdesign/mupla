import type { Reason } from "./types";

/** A reason rendered as text segments; `strong` segments are the data anchors. */
/** `artist` marks segments that name an artist, so the UI can link them to the artist page. */
export type ReasonSegment = { text: string; strong?: boolean; artist?: boolean };

const nf = new Intl.NumberFormat("de-DE");

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
      return [{ text: "Weil " }, { text: r.tag, strong: true }, { text: " zu deinen meistgehörten Genres gehört." }];
    case "adjacent-genre":
      return [
        { text: "" },
        { text: r.tag, strong: true },
        { text: " grenzt an dein Profil an (über " },
        { text: r.via, strong: true },
        { text: "), du kennst es noch nicht." },
      ];
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
