"use client";

import { SPANS, type Span } from "@/domain/views";

/** Week / Month / Year for the timeframe view: a radio group, so arrow keys rotate through it. */
export function SpanSwitch({ value, onChange }: { value: Span; onChange: (s: Span) => void }) {
  return (
    <fieldset className="inline-flex rounded border border-control p-0.5">
      <legend className="sr-only">Zeitraum</legend>
      {SPANS.map((s) => (
        <label
          key={s.key}
          className={`inline-flex min-h-11 cursor-pointer items-center rounded px-3 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
            value === s.key ? "bg-fg text-bg" : "hover:bg-fg/5"
          }`}
        >
          <input type="radio" name="span" value={s.key} checked={value === s.key} onChange={() => onChange(s.key)} className="sr-only" />
          {s.key === "week" ? "Week" : s.key === "month" ? "Month" : "Year"}
        </label>
      ))}
    </fieldset>
  );
}
