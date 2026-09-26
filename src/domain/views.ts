/**
 * Canonical shelves from "00 Konzept/(C) Ansichten & Filter.md". Every view answers one question.
 * View names are short English markers (target group: young, international); the questions stay German.
 */
export const views = [
  { slug: "for-you", label: "For You", question: "Was passt am besten zu dir?" },
  { slug: "upcoming", label: "Upcoming", question: "Was steht als Nächstes an?" },
  { slug: "nearby", label: "Nearby", question: "Was ist ganz in der Nähe?" },
  { slug: "popular", label: "Popular", question: "Wo spielen die großen Namen?" },
  { slug: "new", label: "New", question: "Was ist neu angekündigt oder zum ersten Mal da?" },
  { slug: "timeframe", label: "This Week", question: "Was läuft in diesem Zeitraum?" },
  { slug: "season", label: "Season", question: "Welche Festivals lohnen sich?" },
  { slug: "off-the-grid", label: "Off the Grid", question: "Was liegt knapp außerhalb deines Profils?" },
  { slug: "rewind", label: "Rewind", question: "Wen hast du früher viel gehört?" },
  { slug: "last-chance", label: "Last Chance", question: "Was ist bald und noch nicht vorbei?" },
  { slug: "favorites", label: "Favorites", question: "Was hast du dir gemerkt?" },
] as const;

export type ViewSlug = (typeof views)[number]["slug"];

/** The timeframe view rotates through three spans; its label follows the span. */
export const SPANS = [
  { key: "week", label: "This Week", question: "Was läuft in den nächsten sieben Tagen?", days: 7 },
  { key: "month", label: "This Month", question: "Was läuft in den nächsten 30 Tagen?", days: 30 },
  { key: "year", label: "This Year", question: "Was läuft bis Jahresende?", days: undefined },
] as const;
export type Span = (typeof SPANS)[number]["key"];

export function viewBySlug(slug: string) {
  return views.find((v) => v.slug === slug);
}

/** Label and question for a view, with the timeframe view following the chosen span. */
export function viewMeta(slug: ViewSlug, span: Span = "week"): { label: string; question: string } {
  if (slug === "timeframe") {
    const s = SPANS.find((x) => x.key === span) ?? SPANS[0];
    return { label: s.label, question: s.question };
  }
  const v = viewBySlug(slug)!;
  return { label: v.label, question: v.question };
}
