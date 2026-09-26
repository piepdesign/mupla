import type { ElementType, ReactNode } from "react";
import { onColor, type TextAccent } from "@/design/tokens";

// Static class maps so Tailwind can see every class at build time.
const bgClass: Record<TextAccent, string> = {
  acid: "bg-acid",
  cyan: "bg-cyan",
  amber: "bg-amber",
  coral: "bg-coral",
  electric: "bg-electric",
  violet: "bg-violet",
  "deep-green": "bg-deep-green",
  plum: "bg-plum",
};
const textClass = { ink: "text-ink", paper: "text-paper" } as const;

/**
 * A coloured surface. The text colour is derived from the accent, never passed in,
 * so an inaccessible combination cannot be written. Magenta is not a TextAccent.
 */
export function AccentSurface({
  accent,
  as: Tag = "div",
  className = "",
  children,
}: {
  accent: TextAccent;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`${bgClass[accent]} ${textClass[onColor(accent)]} ${className}`}>{children}</Tag>;
}
