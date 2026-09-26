"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon, UserIcon } from "./icons";
import { SEARCH_INPUT_ID } from "./SearchPanel";

const btn = "inline-flex h-11 w-11 items-center justify-center rounded";

export function ToolNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onProfile = pathname === "/profil";

  // One search for the whole app: on the overview the button focuses the bar, elsewhere it goes there first.
  function focusSearch() {
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (pathname === "/" && input) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      input.focus({ preventScroll: true });
    } else {
      router.push("/?focus=search");
    }
  }

  return (
    <nav aria-label="Werkzeuge">
      <ul className="flex gap-1">
        <li>
          <button type="button" onClick={focusSearch} aria-label="Suche" title="Suche" className={`${btn} hover:bg-fg/10`}>
            <SearchIcon />
          </button>
        </li>
        <li>
          <Link
            href="/profil"
            aria-label="Mein Profil"
            title="Mein Profil"
            aria-current={onProfile ? "page" : undefined}
            className={`${btn} ${onProfile ? "bg-fg text-bg" : "hover:bg-fg/10"}`}
          >
            <UserIcon />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
