/** Placeholder until stage 5. Real form controls, disabled, so the layout and tab order are already honest. */
export function FilterBarPlaceholder() {
  return (
    <form aria-label="Filter" className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fg-muted">Umkreis</span>
        <select disabled defaultValue="150" className="min-h-11 rounded border border-control bg-bg px-2 text-fg disabled:opacity-100">
          <option value="150">150 km</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fg-muted">Zeitraum</span>
        <select disabled defaultValue="all" className="min-h-11 rounded border border-control bg-bg px-2 text-fg disabled:opacity-100">
          <option value="all">Alle Termine</option>
        </select>
      </label>
      <p className="pb-2.5 text-sm text-fg-muted">Filter folgen in Etappe 5.</p>
    </form>
  );
}
