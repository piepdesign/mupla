import type { Accent } from "@/design/tokens";

/** Content sections (profile, artist page) share one frame: accent bar heading, optional hint, content on the surface colour. */
export function Panel({ id, title, accent, hint, children }: { id: string; title: string; accent: Accent; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-stretch gap-3">
        <span aria-hidden="true" className="w-1.5 shrink-0 rounded-full" style={{ background: `var(--${accent})` }} />
        <div>
          <h2 id={id} className="display text-[1.5rem]">
            {title}
          </h2>
          {hint && <p className="text-sm text-fg-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
