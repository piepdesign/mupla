"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

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

const ORDER: Mode[] = ["system", "light", "dark"];
const ICON = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };

/** One icon button that cycles System, Hell, Dunkel. The name says the current mode and what a press does. */
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

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const Icon = ICON[mode];
  return (
    <button
      type="button"
      onClick={() => change(next)}
      aria-label={`Darstellung: ${labels[mode]}. Wechseln zu ${labels[next]}`}
      title={`Darstellung: ${labels[mode]}`}
      className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-fg/10"
    >
      <Icon />
    </button>
  );
}
