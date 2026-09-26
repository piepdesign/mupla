"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

const KEY = "mupla-theme";

/** Runs before paint (see layout.tsx) so the chosen theme does not flash. Without a stored choice the system decides. */
export const themeBootScript = `try{var m=localStorage.getItem("${KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-theme",m)}catch(e){}`;

function currentIsDark(): boolean {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr) return attr === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Light/dark switch. Starts from the system setting; a press stores an explicit choice.
 * A toggle button (aria-pressed) so screen readers announce the state, not an action.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Read what the boot script or the system already applied.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(currentIsDark());
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Dunkles Design"
      title={dark ? "Helles Design" : "Dunkles Design"}
      className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-fg/10"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
