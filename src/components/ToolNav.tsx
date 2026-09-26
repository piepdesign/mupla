"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon, UserIcon } from "./icons";

const LINKS = [
  ["/suche", "Suche", SearchIcon],
  ["/profil", "Mein Profil", UserIcon],
] as const;

export function ToolNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Werkzeuge">
      <ul className="flex gap-1">
        {LINKS.map(([href, label, Icon]) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-11 w-11 items-center justify-center rounded ${active ? "bg-fg text-bg" : "hover:bg-fg/10"}`}
              >
                <Icon />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
