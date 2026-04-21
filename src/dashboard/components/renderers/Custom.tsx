import type { RendererProps } from './common.js';

// Custom assertions can produce arbitrary details the user chose to return.
// Render them as a JSON block so whatever the user returned is visible.
export function CustomRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  if (Object.keys(d).length === 0) return null;
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[color:var(--color-text-dim)]">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}
