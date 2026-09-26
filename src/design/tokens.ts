/**
 * Single source of truth for colour tokens.
 * globals.css mirrors these values; `npm run contrast` checks both the
 * WCAG pairs below and that the CSS still matches this file.
 */

export const base = {
  ink: "#0B0B0F",
  paper: "#F4F1EA",
  "ink-soft": "#17171F",
  "paper-soft": "#FFFDF8",
  line: "#2A2A35",
  "line-light": "#D9D4C7",
} as const;

/**
 * Accent colours and the only text colour allowed on each.
 * `on: null` means no text below large size (24px bold / 18.66px bold, WCAG "large text").
 */
export const accents = {
  acid: { hex: "#D7F25C", on: "ink" },
  cyan: { hex: "#22D3EE", on: "ink" },
  amber: { hex: "#FFB703", on: "ink" },
  coral: { hex: "#FF5A3C", on: "ink" },
  electric: { hex: "#3B2BF5", on: "paper" },
  violet: { hex: "#6D28D9", on: "paper" },
  "deep-green": { hex: "#0F5132", on: "paper" },
  plum: { hex: "#2A1A4A", on: "paper" },
  magenta: { hex: "#E0218A", on: null, onLarge: "paper" },
} as const satisfies Record<
  string,
  { hex: string; on: "ink" | "paper" | null; onLarge?: "ink" | "paper" }
>;

export type Accent = keyof typeof accents;

/** Accents that may carry body text. Magenta is excluded at type level. */
export type TextAccent = {
  [K in Accent]: (typeof accents)[K]["on"] extends null ? never : K;
}[Accent];

/** The text colour that belongs to an accent. Not choosable, only derivable. */
export type OnColor<A extends TextAccent> = (typeof accents)[A]["on"];

export function onColor<A extends TextAccent>(accent: A): OnColor<A> {
  return accents[accent].on as OnColor<A>;
}

/** Semantic roles per theme. These are what components use. */
export const themes = {
  dark: {
    bg: base.ink,
    surface: base["ink-soft"],
    text: base.paper,
    "text-muted": "#B4B1C0",
    border: base.line,
    "control-border": "#77758A",
    focus: accents.acid.hex,
  },
  light: {
    bg: base.paper,
    surface: base["paper-soft"],
    text: base.ink,
    "text-muted": "#52505A",
    border: base["line-light"],
    "control-border": "#7C786E",
    focus: accents.electric.hex,
  },
} as const;

export type ThemeName = keyof typeof themes;
export type Role = keyof (typeof themes)["dark"];

/**
 * Accent pairs rotate between shelves (never inside one card).
 * First colour is the surface, second is the graphic accent.
 */
export const shelfPairs: readonly (readonly [TextAccent, Accent])[] = [
  ["acid", "electric"],
  ["electric", "cyan"],
  ["amber", "plum"],
  ["violet", "acid"],
  ["cyan", "magenta"],
  ["deep-green", "amber"],
  ["coral", "plum"],
  ["plum", "coral"],
] as const;

export function pairFor(key: string): readonly [TextAccent, Accent] {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return shelfPairs[h % shelfPairs.length];
}
