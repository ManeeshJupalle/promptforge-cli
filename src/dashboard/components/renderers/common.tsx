import type { StoredAssertion } from '../../lib/types.js';

export type RendererProps = { assertion: StoredAssertion };

export function pickString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}
export function pickNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
export function pickArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

export function StatusBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-pass)]">
      <span aria-hidden>✓</span>pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-fail)]">
      <span aria-hidden>✗</span>fail
    </span>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-20 shrink-0 font-mono text-[color:var(--color-text-muted)]">{label}</span>
      <span className="min-w-0 flex-1 break-words font-mono text-[color:var(--color-text-dim)]">
        {children}
      </span>
    </div>
  );
}
