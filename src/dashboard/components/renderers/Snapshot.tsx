import { DetailRow, pickNumber, pickString, type RendererProps } from './common.js';

export function SnapshotRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const similarity = pickNumber(d.similarity);
  const threshold = pickNumber(d.threshold);
  const stored = pickString(d.stored);
  const received = pickString(d.received);
  return (
    <div className="space-y-1">
      {similarity !== null && threshold !== null && (
        <DetailRow label="similarity">
          <span
            className={
              similarity >= threshold
                ? 'text-[color:var(--color-pass)]'
                : 'text-[color:var(--color-fail)]'
            }
          >
            {similarity.toFixed(3)}
          </span>
          <span className="text-[color:var(--color-text-muted)]"> / threshold {threshold.toFixed(3)}</span>
        </DetailRow>
      )}
      {stored !== null && <DetailRow label="stored">{stored}</DetailRow>}
      {received !== null && <DetailRow label="received">{received}</DetailRow>}
    </div>
  );
}
