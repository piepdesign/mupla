import { ChevronDownIcon } from "./icons";

/**
 * Native select with its own chevron: the browser arrow sat on the border in some engines.
 * appearance-none + padding on the right keeps the arrow inside the box in every theme.
 */
export function SelectField({
  label,
  value,
  onChange,
  children,
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-fg-muted">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full appearance-none rounded border border-control bg-bg py-2 pr-10 pl-3 text-fg"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
      </span>
    </label>
  );
}
