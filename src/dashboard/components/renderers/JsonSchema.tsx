import { DetailRow, pickArray, type RendererProps } from './common.js';

interface AjvIssue {
  instancePath?: string;
  message?: string;
}

export function JsonSchemaRenderer({ assertion }: RendererProps) {
  const d = assertion.details ?? {};
  const errors = (pickArray(d.errors) as AjvIssue[] | null) ?? [];
  const received = d.received;
  return (
    <div className="space-y-1">
      {errors.length > 0 && (
        <DetailRow label="errors">
          <ul className="space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="text-[color:var(--color-fail)]">
                  {e.instancePath || '(root)'}
                </span>{' '}
                {e.message ?? 'invalid'}
              </li>
            ))}
          </ul>
        </DetailRow>
      )}
      {received !== undefined && (
        <DetailRow label="received">
          <pre className="whitespace-pre-wrap">{JSON.stringify(received, null, 2)}</pre>
        </DetailRow>
      )}
    </div>
  );
}
