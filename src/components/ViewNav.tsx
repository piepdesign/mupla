"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { views } from "@/domain/views";

export function ViewNav() {
  const pathname = usePathname();
  const current = pathname === "/" ? "for-you" : pathname.split("/")[2];

  return (
    <nav aria-label="Ansichten">
      <ul className="flex gap-1 overflow-x-auto pb-1">
        {views.map((v) => {
          const active = v.slug === current;
          return (
            <li key={v.slug} className="shrink-0">
              <Link
                href={v.slug === "for-you" ? "/" : `/ansicht/${v.slug}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded px-3 text-sm font-medium whitespace-nowrap ${
                  active ? "bg-fg text-bg" : "text-fg hover:bg-fg/10"
                }`}
              >
                {v.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
