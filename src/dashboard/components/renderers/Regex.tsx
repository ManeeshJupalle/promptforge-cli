import { DetailRow, pickString, type RendererProps } from './common.js';

export function RegexRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const pattern = pickString(d.pattern);
  const flags = pickString(d.flags) ?? '';
  const received = pickString(d.received);
  return (
    <div className="space-y-1">
      {pattern !== null && <DetailRow label="pattern">{`/${pattern}/${flags}`}</DetailRow>}
      {received !== null && <DetailRow label="received">{received}</DetailRow>}
    </div>
  );
}
