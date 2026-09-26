import type { Recommendation } from "./types";
import { totalScore, type EventMatch } from "./scoring";
import { reasonToString } from "./reasons";

export type Check = { label: string; ok: boolean; detail: string };

const ARTIST_REASONS = new Set(["direct-artist", "similar-artist", "lineup-match", "dormant-artist"]);

/**
 * Acceptance check (stage 6): does every reason line follow from the score components and the match they came from?
 * Returns human-readable checks so the result can be shown and read, not just asserted.
 */
export function crossCheck(rec: Recommendation, m: EventMatch): Check[] {
  const checks: Check[] = [];
  const sum = totalScore(rec.components);
  checks.push({ label: "Score = gewichtete Summe", ok: Math.abs(sum - rec.score) < 1e-9, detail: `${sum.toFixed(4)} vs. ${rec.score.toFixed(4)}` });

  for (const r of rec.reasons) {
    let ok = false;
    let detail = "";
    switch (r.type) {
      case "direct-artist": {
        const d = m.direct.find((x) => x.name === r.artist);
        ok = Boolean(d && d.plays === r.plays);
        detail = d ? `Profil: ${d.name}, ${d.plays} Scrobbles` : "Artist nicht im Match";
        break;
      }
      case "similar-artist": {
        const s = m.similar.find((x) => x.name === r.artist && x.via === r.via);
        ok = Boolean(s);
        detail = s ? `Last.fm-Ähnlichkeit ${s.match.toFixed(2)} zu ${s.via}` : "Ähnlichkeit nicht im Match";
        break;
      }
      case "lineup-match":
        ok = r.count === m.direct.length && r.examples.every((x) => m.direct.some((d) => d.name === x));
        detail = `${m.direct.length} direkte Treffer im Line-up`;
        break;
      case "dormant-artist": {
        const d = m.dormant.find((x) => x.name === r.artist && x.period === r.period);
        ok = Boolean(d);
        detail = d ? `zuletzt stark ${d.period}` : "nicht im Match";
        break;
      }
      case "genre-match": {
        const g = m.genres.find((x) => x.tag === r.tag && x.artist === r.artist);
        ok = Boolean(g);
        detail = g ? `Genre-Gewicht ${g.weight.toFixed(2)}${g.broad ? " (Oberbegriff, halbiert)" : ""}${g.artist ? `, Tag von ${g.artist}` : ", Einordnung des Events"}` : "Genre nicht im Match";
        break;
      }
      case "adjacent-genre": {
        const g = m.adjacentGenres.find((x) => x.tag === r.tag && x.via === r.via);
        ok = Boolean(g);
        detail = g ? `angrenzend über ${g.via}` : "nicht im Match";
        break;
      }
    }
    checks.push({ label: `Begründung: ${reasonToString(r)}`, ok, detail });
  }

  const hasArtistReason = rec.reasons.some((r) => ARTIST_REASONS.has(r.type));
  const hasArtistMatch = m.direct.length + m.similar.length > 0;
  checks.push({
    label: "Artist-Treffer und Begründung passen zusammen",
    ok: hasArtistReason === hasArtistMatch,
    detail: hasArtistMatch ? "Artist im Match, Artist in der Begründung" : "kein Artist im Match, Begründung über Genre",
  });
  if (rec.components.discovery > 0) {
    const ok = rec.reasons.some((r) => r.type === "similar-artist" || r.type === "adjacent-genre");
    checks.push({ label: "Entdeckungsbonus ist begründet", ok, detail: `Entdeckung ${rec.components.discovery.toFixed(2)}` });
  }
  return checks;
}
