import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/uncut-sans/latin-400.css";
import "@fontsource/uncut-sans/latin-500.css";
import "@fontsource/uncut-sans/latin-600.css";
import "@fontsource/uncut-sans/latin-700.css";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";
import { ThemeToggle, themeBootScript } from "@/components/ThemeToggle";
import { ToolNav } from "@/components/ToolNav";
import { ViewNav } from "@/components/ViewNav";

export const metadata: Metadata = {
  title: "mupla",
  description: "Konzerte, Tourneen und Festivals aus deinem Hörprofil, jeweils mit Begründung.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-fg focus:px-4 focus:py-3 focus:text-bg"
        >
          Zum Inhalt springen
        </a>

        <header className="border-b border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="display inline-flex min-h-11 items-center text-[2rem] leading-none" aria-label="mupla, Startseite">
                mupla
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <ToolNav />
                <ThemeToggle />
              </div>
            </div>
            <ViewNav />
          </div>
        </header>

        <main id="inhalt" tabIndex={-1} className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 focus:outline-none sm:px-6">
          {children}
        </main>

        <footer className="mt-12 border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-fg-muted sm:px-6">
            <p>
              Datenquellen und Lizenzen stehen auf der Seite{" "}
              <Link href="/quellen" className="underline underline-offset-2 hover:text-fg">
                Quellen und Datenschutz
              </Link>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
