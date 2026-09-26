"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { views } from "@/domain/views";

/** Filters live in the query string; view links carry it along so filters survive a view switch. */
export function ViewNav() {
  return (
    <Suspense fallback={<NavList query="" />}>
      <NavWithQuery />
    </Suspense>
  );
}

function NavWithQuery() {
  const qs = useSearchParams().toString();
  return <NavList query={qs ? `?${qs}` : ""} />;
}

function NavList({ query }: { query: string }) {
  const pathname = usePathname();
  const current = pathname === "/" ? "for-you" : pathname.startsWith("/ansicht/") ? pathname.split("/")[2] : undefined;

  return (
    <nav aria-label="Ansichten">
      <ul className="flex flex-wrap gap-1">
        {views.map((v) => {
          const active = v.slug === current;
          return (
            <li key={v.slug} className="shrink-0">
              <Link
                href={`${v.slug === "for-you" ? "/" : `/ansicht/${v.slug}`}${query}`}
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
