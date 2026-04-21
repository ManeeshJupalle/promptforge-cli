import { useEffect, useMemo, useState } from 'react';
import { getRuns } from '../lib/api.js';
import type { RunRow } from '../lib/types.js';
import { RunList } from '../components/RunList.js';

export function Runs() {
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<'any' | 'pass' | 'fail'>('any');

  useEffect(() => {
    setRuns(null);
    setError(null);
    getRuns({
      provider: provider || undefined,
      status: status === 'any' ? undefined : status,
      limit: 100,
    })
      .then((r) => setRuns(r.runs))
      .catch((e: Error) => setError(e.message));
  }, [provider, status]);

  const counts = useMemo(() => {
    if (!runs) return null;
    const passed = runs.filter((r) => (r.failed ?? 0) === 0).length;
    return { total: runs.length, passed, failed: runs.length - passed };
  }, [runs]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Runs
          </h1>
          <p className="text-sm text-[color:var(--color-text-dim)]">
            History of every <code className="font-mono">promptforge run</code>, newest first.
          </p>
        </div>
        {counts && (
          <div className="flex gap-4 text-xs text-[color:var(--color-text-dim)]">
            <span>{counts.total} runs</span>
            <span className="text-[color:var(--color-pass)]">{counts.passed} clean</span>
            <span className="text-[color:var(--color-fail)]">{counts.failed} with failures</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <input
          type="text"
          placeholder="filter by provider (substring)…"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-64 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          <option value="any">any status</option>
          <option value="pass">clean only</option>
          <option value="fail">with failures</option>
        </select>
      </div>

      {error && (
        <div className="rounded border border-[color:var(--color-fail)] bg-[color:var(--color-fail)]/10 p-3 text-sm text-[color:var(--color-fail)]">
          {error}
        </div>
      )}

      {runs === null ? (
        <div className="text-sm text-[color:var(--color-text-dim)]">loading…</div>
      ) : (
        <RunList runs={runs} />
      )}
    </div>
  );
}
