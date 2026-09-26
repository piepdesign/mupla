import type { TextAccent } from "@/design/tokens";

/**
 * Heading for rows and full views: an accent bar, the name in display type and the view's question.
 * Colour stays an accent, not a full surface; the text sits on the page background.
 */
export function SectionHeader({
  id,
  title,
  question,
  accent,
  level = 2,
  children,
}: {
  id: string;
  title: string;
  question: string;
  accent: TextAccent;
  level?: 1 | 2;
  children?: React.ReactNode;
}) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="flex items-stretch gap-3">
        <span aria-hidden="true" className="w-1.5 shrink-0 rounded-full" style={{ background: `var(--${accent})` }} />
        <div>
          <H id={id} className={`display ${level === 1 ? "text-[2.25rem] sm:text-[3rem]" : "text-[1.75rem] sm:text-[2rem]"}`}>
            {title}
          </H>
          <p className="text-sm text-fg-muted">{question}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
