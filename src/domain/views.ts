/** Canonical shelves from "00 Konzept/(C) Ansichten & Filter.md". Every view answers one question. */
export const views = [
  { slug: "for-you", label: "For You", question: "Was passt am besten zu dir?" },
  { slug: "upcoming", label: "Upcoming", question: "Was steht als Nächstes an?" },
  { slug: "nearby", label: "Nearby", question: "Was ist ganz in der Nähe?" },
  { slug: "popular", label: "Popular", question: "Wo spielen die großen Namen?" },
  { slug: "new", label: "New", question: "Was ist neu angekündigt oder zum ersten Mal da?" },
  { slug: "this-week", label: "Diese Woche", question: "Was läuft in den nächsten sieben Tagen?" },
  { slug: "this-month", label: "Dieser Monat", question: "Was läuft in den nächsten 30 Tagen?" },
  { slug: "this-year", label: "Dieses Jahr", question: "Was läuft bis Jahresende?" },
  { slug: "festivals", label: "Festivalsaison", question: "Welche Festivals lohnen sich?" },
  { slug: "grenzgaenger", label: "Grenzgänger", question: "Was liegt knapp außerhalb deines Profils?" },
  { slug: "wiedersehen", label: "Wiedersehen", question: "Wen hast du früher viel gehört?" },
  { slug: "letzte-chance", label: "Letzte Chance", question: "Was ist bald und noch nicht vorbei?" },
  { slug: "favoriten", label: "Meine Favoriten", question: "Was hast du dir gemerkt?" },
] as const;

export type ViewSlug = (typeof views)[number]["slug"];

export function viewBySlug(slug: string) {
  return views.find((v) => v.slug === slug);
}
