import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { getRun } from '../lib/api.js';
import type { RunDetail as RunDetailType, ResultDTO } from '../lib/types.js';
import { AssertionRow } from '../components/AssertionRow.js';
import { formatCost, formatDateTime, formatLatency } from '../lib/format.js';

export function RunDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = params?.id ?? '';
  const [data, setData] = useState<RunDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getRun(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="rounded border border-[color:var(--color-fail)] bg-[color:var(--color-fail)]/10 p-3 text-sm text-[color:var(--color-fail)]">
        {error}
      </div>
    );
  }
  if (!data) return <div className="text-sm text-[color:var(--color-text-dim)]">loading…</div>;

  const { run, results } = data;
  const byFile = new Map<string, ResultDTO[]>();
  for (const r of results) {
    const list = byFile.get(r.test_file) ?? [];
    list.push(r);
    byFile.set(r.test_file, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"
          >
            ← all runs
          </button>
        </div>
        <h1
          className="font-mono text-2xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          run {run.id}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[color:var(--color-text-dim)]">
          <span>{formatDateTime(run.started_at)}</span>
          {run.finished_at !== null && (
            <span>
              duration {((run.finished_at - run.started_at) / 1000).toFixed(2)}s
            </span>
          )}
          <span>
            <span className="text-[color:var(--color-pass)]">{run.passed ?? 0}</span>
            {' / '}
            <span className="text-[color:var(--color-fail)]">{run.failed ?? 0}</span>
            {' / '}
            {run.total_tests ?? 0}
          </span>
          <span>{formatCost(run.total_cost)}</span>
          {run.git_commit && <span className="font-mono">{run.git_commit.slice(0, 7)}</span>}
          {run.config_hash && (
            <span className="font-mono">config {run.config_hash.slice(0, 8)}</span>
          )}
          <Link
            href={`/compare?a=previous&b=${run.id}`}
            className="ml-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text)]"
          >
            compare to previous →
          </Link>
        </div>
      </div>

      {Array.from(byFile.entries()).map(([file, rs]) => (
        <section key={file} className="space-y-3">
          <h2 className="font-mono text-sm text-[color:var(--color-text-dim)]">{file}</h2>
          <div className="space-y-2">
            {rs.map((r) => (
              <ResultCard key={r.id} result={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: ResultDTO }) {
  const [open, setOpen] = useState(false);
  const isPass = result.passed === 1;
  return (
    <div
      className={
        'rounded border bg-[color:var(--color-surface)] ' +
        (isPass ? 'border-[color:var(--color-border)]' : 'border-[color:var(--color-fail)]/50')
      }
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--color-surface-hi)]"
      >
        <span
          className="font-mono text-sm"
          style={{ color: isPass ? 'var(--color-pass)' : 'var(--color-fail)' }}
        >
          {isPass ? '✓' : '✗'}
        </span>
        <span className="flex-1 text-sm">{result.test_name}</span>
        <span className="text-[11px] font-mono text-[color:var(--color-text-muted)]">
          {result.provider}
        </span>
        <span className="text-[11px] font-mono text-[color:var(--color-text-muted)]">
          {formatLatency(result.latency_ms)}
        </span>
        {(result.cost ?? 0) > 0 && (
          <span className="text-[11px] font-mono text-[color:var(--color-text-muted)]">
            {formatCost(result.cost)}
          </span>
        )}
        <span className="text-[color:var(--color-text-muted)]" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-[color:var(--color-border)] px-4 py-4">
          {result.error && (
            <div className="rounded border border-[color:var(--color-fail)]/60 bg-[color:var(--color-fail)]/10 p-3 font-mono text-xs text-[color:var(--color-fail)]">
              {result.error}
            </div>
          )}
          {result.input_vars != null && Object.keys(result.input_vars as object).length > 0 && (
            <Section label="input vars">
              <pre className="overflow-auto rounded bg-[color:var(--color-surface-hi)] p-3 font-mono text-xs">
                {JSON.stringify(result.input_vars, null, 2)}
              </pre>
            </Section>
          )}
          <Section label="output">
            <pre className="overflow-auto rounded bg-[color:var(--color-surface-hi)] p-3 font-mono text-xs whitespace-pre-wrap break-words">
              {result.output || '(empty)'}
            </pre>
          </Section>
          {result.assertions.length > 0 && (
            <Section label="assertions">
              <div className="space-y-2">
                {result.assertions.map((a, i) => (
                  <AssertionRow key={i} assertion={a} />
                ))}
              </div>
            </Section>
          )}
          <Section label="usage">
            <div className="flex flex-wrap gap-4 text-xs font-mono text-[color:var(--color-text-dim)]">
              <span>prompt tokens: {result.prompt_tokens ?? '—'}</span>
              <span>completion tokens: {result.completion_tokens ?? '—'}</span>
              <span>cost: {formatCost(result.cost)}</span>
              <span>latency: {formatLatency(result.latency_ms)}</span>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-mono uppercase tracking-wide text-[color:var(--color-text-muted)]">
        {label}
      </div>
      {children}
    </div>
  );
}
