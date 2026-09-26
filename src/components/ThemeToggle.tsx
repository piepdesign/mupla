"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const KEY = "mupla-theme";
const labels: Record<Mode, string> = { system: "System", light: "Hell", dark: "Dunkel" };

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

/** Runs before paint (see layout.tsx) so the chosen theme does not flash. */
export const themeBootScript = `try{var m=localStorage.getItem("${KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-theme",m)}catch(e){}`;

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      // Sync with the value the boot script already applied.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "light" || stored === "dark") setMode(stored);
    } catch {}
  }, []);

  function change(next: Mode) {
    setMode(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {}
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-fg-muted">Darstellung</span>
      <select
        value={mode}
        onChange={(e) => change(e.target.value as Mode)}
        className="min-h-11 rounded border border-control bg-surface px-2 text-fg"
      >
        {(Object.keys(labels) as Mode[]).map((m) => (
          <option key={m} value={m}>
            {labels[m]}
          </option>
        ))}
      </select>
    </label>
  );
}
