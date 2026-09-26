"use client";

import { useState } from "react";
import { HeartIcon } from "./icons";

/**
 * Controlled when `state` is given (favourites store), otherwise local only.
 * `compact` shows only the heart; the accessible name still says what is saved.
 */
export function FavoriteToggle({ label, state, compact = false }: { label: string; state?: { on: boolean; toggle: () => void }; compact?: boolean }) {
  const [localOn, setLocalOn] = useState(false);
  const on = state ? state.on : localOn;
  const toggle = state ? state.toggle : () => setLocalOn((v) => !v);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      title={compact ? (on ? "Gemerkt" : "Merken") : undefined}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded border border-control px-3 text-sm font-medium hover:bg-fg/5"
    >
      <HeartIcon className="h-5 w-5" filled={on} />
      <span className={compact ? "sr-only" : undefined}>{on ? "Gemerkt" : "Merken"}</span>
      <span className="sr-only">: {label}</span>
    </button>
  );
}
