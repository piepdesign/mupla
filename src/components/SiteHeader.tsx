"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { ToolNav } from "./ToolNav";

/** Pixels of upward scroll before the header comes back; keeps it from flickering on tiny movements. */
const REVEAL_AFTER = 8;

/**
 * Sticky header that slides away while scrolling down and returns on a slight scroll up.
 * It also returns whenever focus moves into it, so keyboard users never tab into an invisible header.
 * The slide is disabled under prefers-reduced-motion (globals.css), the header then simply appears.
 */
export function SiteHeader() {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const upAcc = useRef(0);

  useEffect(() => {
    last.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last.current;
      last.current = y;
      if (y < 80) {
        upAcc.current = 0;
        setHidden(false);
      } else if (dy > 0) {
        upAcc.current = 0;
        setHidden(true);
      } else if (dy < 0) {
        upAcc.current -= dy;
        if (upAcc.current >= REVEAL_AFTER) setHidden(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      onFocusCapture={() => setHidden(false)}
      className={`sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur transition-transform duration-200 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/" className="display inline-flex min-h-11 items-center text-[2rem] leading-none" aria-label="mupla, Übersicht">
          mupla
        </Link>
        <div className="flex items-center gap-1">
          <ToolNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
