import { Link } from 'wouter';
import type { RunRow } from '../lib/types.js';
import { formatCost, formatDateTime, formatRelative } from '../lib/format.js';

export function RunList({ runs }: { runs: RunRow[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded border border-dashed border-[color:var(--color-border)] p-8 text-center text-sm text-[color:var(--color-text-dim)]">
        No runs yet. Invoke <code className="font-mono">promptforge run</code> to record one.
      </div>
    );
  }
  return (
    <div className="divide-y divide-[color:var(--color-border)] overflow-hidden rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      {runs.map((r) => (
        <RunRow key={r.id} run={r} />
      ))}
    </div>
  );
}

function RunRow({ run }: { run: RunRow }) {
  const passed = run.passed ?? 0;
  const failed = run.failed ?? 0;
  const total = run.total_tests ?? passed + failed;
  // A null finished_at means the runner row was inserted but the run never
  // completed (crashed, force-killed, still in progress). Those rows must
  // never render as green, or a silent CI failure looks identical to a
  // passing run. listRunsFiltered filters these out of the main list by
  // default, but the component still handles them defensively in case
  // includeUnfinished=true is opted into elsewhere.
  const unfinished = run.finished_at === null;
  const duration =
    run.finished_at === null
      ? '—'
      : `${((run.finished_at - run.started_at) / 1000).toFixed(2)}s`;
  return (
    <Link
      href={`/runs/${run.id}`}
      className="flex items-center gap-4 px-5 py-3 transition hover:bg-[color:var(--color-surface-hi)]"
    >
      <StatusPill failed={failed} total={total} unfinished={unfinished} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{run.id}</span>
          {run.git_commit && (
            <span className="font-mono text-[11px] text-[color:var(--color-text-muted)]">
              {run.git_commit.slice(0, 7)}
            </span>
          )}
          {unfinished && (
            <span
              className="rounded bg-[color:var(--color-warning,#c88a00)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-black"
              title="Run row was inserted but never finalized — likely crashed or interrupted."
            >
              incomplete
            </span>
          )}
        </div>
        <div className="text-xs text-[color:var(--color-text-dim)]">
          {formatDateTime(run.started_at)}{' '}
          <span className="text-[color:var(--color-text-muted)]">· {formatRelative(run.started_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-5 text-xs text-[color:var(--color-text-dim)]">
        <span>
          <span className="text-[color:var(--color-pass)]">{passed}</span>/
          <span className="text-[color:var(--color-fail)]">{failed}</span>/{total}
        </span>
        <span>{formatCost(run.total_cost)}</span>
        <span>{duration}</span>
      </div>
    </Link>
  );
}

function StatusPill({
  failed,
  total,
  unfinished,
}: {
  failed: number;
  total: number;
  unfinished: boolean;
}) {
  if (unfinished) {
    // Amber/yellow dot for incomplete rows — distinct from both the muted
    // empty-run dot and the pass/fail colors.
    return (
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: 'var(--color-warning, #c88a00)' }}
        aria-hidden
      />
    );
  }
  if (total === 0) {
    return (
      <span className="h-2 w-2 rounded-full bg-[color:var(--color-text-muted)]" aria-hidden />
    );
  }
  const color = failed === 0 ? 'var(--color-pass)' : 'var(--color-fail)';
  return <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />;
}
