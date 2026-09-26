/**
 * Every link that leaves mupla goes through here: new tab, rel="noopener noreferrer",
 * a visible arrow and a screen-reader hint, so it is never a surprise.
 */
export function ExternalLink({
  href,
  children,
  context,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  /** Spoken after the visible label, e.g. which event the tickets are for. */
  context?: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center gap-1.5 rounded px-4 text-sm font-semibold ${
        primary ? "bg-fg text-bg hover:opacity-90" : "border border-control text-fg hover:bg-fg/5"
      }`}
    >
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">
        {context ? ` (${context}, ` : " ("}externer Link, neuer Tab)
      </span>
    </a>
  );
}
