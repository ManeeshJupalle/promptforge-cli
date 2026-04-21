import { DetailRow, pickNumber, pickString, type RendererProps } from './common.js';

export function LlmJudgeRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const judgeModel = pickString(d.judgeModel);
  const score = pickNumber(d.score);
  const threshold = pickNumber(d.threshold);
  const reasoning = pickString(d.reasoning);
  const judgeCost = pickNumber(d.judgeCost);
  const judgeLatency = pickNumber(d.judgeLatencyMs);
  return (
    <div className="space-y-1">
      {score !== null && (
        <DetailRow label="score">
          <span
            className={
              threshold !== null && score >= threshold
                ? 'text-[color:var(--color-pass)]'
                : 'text-[color:var(--color-fail)]'
            }
          >
            {score}/5
          </span>
          {threshold !== null && (
            <span className="text-[color:var(--color-text-muted)]"> / threshold {threshold}</span>
          )}
        </DetailRow>
      )}
      {judgeModel !== null && <DetailRow label="judge">{judgeModel}</DetailRow>}
      {reasoning !== null && <DetailRow label="reasoning">{reasoning}</DetailRow>}
      {(judgeCost !== null || judgeLatency !== null) && (
        <DetailRow label="judge cost">
          {judgeCost !== null ? `$${judgeCost.toFixed(6)}` : '—'}
          {judgeLatency !== null && (
            <span className="text-[color:var(--color-text-muted)]"> · {judgeLatency}ms</span>
          )}
        </DetailRow>
      )}
    </div>
  );
}
