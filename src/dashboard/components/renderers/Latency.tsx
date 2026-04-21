import { DetailRow, pickNumber, type RendererProps } from './common.js';

export function LatencyRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const latencyMs = pickNumber(d.latencyMs);
  const maxMs = pickNumber(d.maxMs);
  return (
    <div className="space-y-1">
      {latencyMs !== null && maxMs !== null && (
        <DetailRow label="latency">
          <span
            className={
              latencyMs <= maxMs
                ? 'text-[color:var(--color-pass)]'
                : 'text-[color:var(--color-fail)]'
            }
          >
            {latencyMs}ms
          </span>
          <span className="text-[color:var(--color-text-muted)]"> / budget {maxMs}ms</span>
        </DetailRow>
      )}
    </div>
  );
}
