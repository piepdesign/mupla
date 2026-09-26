/**
 * WCAG 2.1 contrast check for all token pairs.
 * Exits with code 1 if any pair misses AA or if globals.css drifted from tokens.ts.
 * Run: npm run contrast
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { accents, base, themes } from "../src/design/tokens";

const AA_TEXT = 4.5;
const AA_LARGE_OR_UI = 3;

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

type Check = { label: string; fg: string; bg: string; min: number };
const checks: Check[] = [];

for (const [themeName, t] of Object.entries(themes)) {
  for (const surface of ["bg", "surface"] as const) {
    checks.push(
      { label: `${themeName}: text on ${surface}`, fg: t.text, bg: t[surface], min: AA_TEXT },
      { label: `${themeName}: text-muted on ${surface}`, fg: t["text-muted"], bg: t[surface], min: AA_TEXT },
      { label: `${themeName}: control-border on ${surface}`, fg: t["control-border"], bg: t[surface], min: AA_LARGE_OR_UI },
      { label: `${themeName}: focus ring on ${surface}`, fg: t.focus, bg: t[surface], min: AA_LARGE_OR_UI },
    );
  }
}

const textColor = { ink: base.ink, paper: base.paper } as const;
for (const [name, a] of Object.entries(accents)) {
  if (a.on) {
    checks.push({ label: `accent ${name}: ${a.on} text`, fg: textColor[a.on], bg: a.hex, min: AA_TEXT });
  }
  if ("onLarge" in a && a.onLarge) {
    checks.push({ label: `accent ${name}: ${a.onLarge} large text only`, fg: textColor[a.onLarge], bg: a.hex, min: AA_LARGE_OR_UI });
  }
}

let failed = 0;
const rows = checks.map((c) => {
  const ratio = contrast(c.fg, c.bg);
  const ok = ratio >= c.min;
  if (!ok) failed++;
  return `${ok ? "ok  " : "FAIL"}  ${ratio.toFixed(2).padStart(5)}:1  (min ${c.min})  ${c.label}  ${c.fg} on ${c.bg}`;
});

// Drift check: every token hex in tokens.ts must appear in globals.css under the same name.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").toLowerCase();
const expected: Record<string, string> = {
  ...Object.fromEntries(Object.entries(base)),
  ...Object.fromEntries(Object.entries(accents).map(([k, v]) => [k, v.hex])),
};
for (const [themeName, t] of Object.entries(themes)) {
  for (const [role, hex] of Object.entries(t)) expected[`${themeName}-${role}`] = hex;
}
const drift: string[] = [];
for (const [name, hex] of Object.entries(expected)) {
  if (!css.includes(`--${name}: ${hex.toLowerCase()};`)) drift.push(`--${name}: ${hex}`);
}

console.log(rows.join("\n"));
if (drift.length) {
  console.error(`\nglobals.css is out of sync with src/design/tokens.ts, missing:\n  ${drift.join("\n  ")}`);
}
console.log(`\n${checks.length - failed}/${checks.length} pairs pass WCAG 2.1 AA.`);
if (failed || drift.length) process.exit(1);
