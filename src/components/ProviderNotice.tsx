import type { ProviderStatus } from "@/server/providers/types";

/** Says visibly when a source is missing, instead of silently showing fewer events. */
export function ProviderNotice({ providers }: { providers: ProviderStatus[] }) {
  const problems = providers.filter((p) => p.state !== "ok");
  if (problems.length === 0) return null;
  return (
    <div role="status" className="rounded-card border-2 border-control px-4 py-3 text-sm">
      <p className="font-semibold">
        {problems.length === 1 ? "Eine Quelle fehlt gerade:" : `${problems.length} Quellen fehlen gerade:`}
      </p>
      <ul className="mt-1 list-disc pl-5">
        {problems.map((p) => (
          <li key={p.id}>
            <strong>{p.label}</strong>: {p.message}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-fg-muted">Die übrigen Quellen funktionieren, die Liste ist deshalb unvollständig.</p>
    </div>
  );
}
