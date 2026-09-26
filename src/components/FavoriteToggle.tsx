"use client";

import { useState } from "react";

/** Stage 1: local state only. Persistence follows in stage 5. */
export function FavoriteToggle({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded border border-control px-3 text-sm font-medium hover:bg-fg/5"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
      </svg>
      <span>{on ? "Gemerkt" : "Merken"}</span>
      <span className="sr-only">: {label}</span>
    </button>
  );
}
