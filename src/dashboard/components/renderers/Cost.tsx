import { DetailRow, pickNumber, type RendererProps } from './common.js';

export function CostRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const cost = pickNumber(d.cost);
  const max = pickNumber(d.max);
  return (
    <div className="space-y-1">
      {cost !== null && max !== null && (
        <DetailRow label="cost">
          <span
            className={
              cost <= max
                ? 'text-[color:var(--color-pass)]'
                : 'text-[color:var(--color-fail)]'
            }
          >
            ${cost.toFixed(6)}
          </span>
          <span className="text-[color:var(--color-text-muted)]"> / budget ${max.toFixed(6)}</span>
        </DetailRow>
      )}
    </div>
  );
}
