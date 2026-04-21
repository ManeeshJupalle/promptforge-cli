import type { RendererProps } from './common.js';

// Last-resort renderer for assertion types we don't know about. Day-6+
// assertions or user plugins land here until a dedicated component is added.
export function FallbackRenderer({ assertion }: RendererProps) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[color:var(--color-text-dim)]">
      {JSON.stringify(assertion, null, 2)}
    </pre>
  );
}
