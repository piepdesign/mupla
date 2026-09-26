import { accents, type Accent, type TextAccent } from "@/design/tokens";
import { AccentSurface } from "./AccentSurface";

/**
 * Image fallback: an accent pair plus the artist name in display type.
 * The pair comes from the shelf, not the genre, so a screen area never shows more than two accents.
 * Organic shapes stay in the right half, the name in the left 55%, so shapes never sit under text.
 */
export function GeneratedArt({ pair, label }: { pair: readonly [TextAccent, Accent]; label: string }) {
  const [surface, graphic] = pair;
  let h = 0;
  for (const ch of label) h = (h * 17 + ch.charCodeAt(0)) >>> 0;
  const r1 = 38 + (h % 20);
  const cy = 30 + ((h >> 3) % 40);
  // Long single words would otherwise break mid-word in the wide display cut.
  const longest = Math.max(...label.split(/\s+/).map((w) => w.length));
  const size = longest > 12 ? "text-[0.95rem]" : longest > 8 ? "text-[1.1rem]" : "text-[1.35rem]";
  return (
    <AccentSurface accent={surface} className="relative aspect-[2/1] overflow-hidden">
      <svg aria-hidden="true" viewBox="0 0 160 90" preserveAspectRatio="none" className="absolute inset-y-0 right-0 h-full w-[45%]">
        <circle cx="90" cy={cy} r={r1} fill={accents[graphic].hex} />
        <path d="M0 90 C 30 60, 60 95, 90 70 S 150 80, 160 60 V 90 Z" fill={accents[graphic].hex} opacity="0.55" />
      </svg>
      <span aria-hidden="true" className={`display absolute bottom-3 left-4 max-w-[58%] ${size} break-words hyphens-auto`}>
        {label}
      </span>
    </AccentSurface>
  );
}
