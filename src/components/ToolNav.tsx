"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/suche", "Suche"],
  ["/profil", "Mein Profil"],
] as const;

export function ToolNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Werkzeuge">
      <ul className="flex gap-1">
        {LINKS.map(([href, label]) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded px-3 text-sm font-medium ${pathname === href ? "bg-fg text-bg" : "hover:bg-fg/10"}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
