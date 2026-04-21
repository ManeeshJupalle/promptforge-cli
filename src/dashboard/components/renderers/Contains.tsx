import { DetailRow, pickString, type RendererProps } from './common.js';

export function ContainsRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const expected = pickString(d.expected);
  const unexpected = pickString(d.unexpected);
  const received = pickString(d.received);
  const caseSensitive = d.caseSensitive === true;
  const isNegated = assertion.type === 'notContains';
  const needle = isNegated ? unexpected : expected;
  return (
    <div className="space-y-1">
      {needle !== null && (
        <DetailRow label={isNegated ? 'forbidden' : 'expected'}>
          {needle} {!caseSensitive && <span className="opacity-60">(case-insensitive)</span>}
        </DetailRow>
      )}
      {received !== null && <DetailRow label="received">{received}</DetailRow>}
    </div>
  );
}
