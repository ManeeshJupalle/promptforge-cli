import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { getCompare } from '../lib/api.js';
import type {
  RunComparison,
  RunRow,
  StatusChange,
  TestComparison,
} from '../lib/types.js';
import { DiffViewer } from '../components/DiffViewer.js';
import { formatCost, formatDateTime, formatLatency } from '../lib/format.js';

const SECTION_ORDER: StatusChange[] = [
  'regression',
  'improvement',
  'same-fail',
  'same-pass',
  'added',
  'removed',
];

const SECTION_LABEL: Record<StatusChange, string> = {
  regression: 'Regressions',
  improvement: 'Improvements',
  'same-fail': 'Unchanged (fail)',
  'same-pass': 'Unchanged (pass)',
  added: 'New tests',
  removed: 'Removed tests',
};

const SECTION_COLOR: Record<StatusChange, string> = {
  regression: 'var(--color-fail)',
  improvement: 'var(--color-pass)',
  'same-fail': 'var(--color-text-muted)',
  'same-pass': 'var(--color-text-muted)',
  added: 'var(--color-accent)',
  removed: 'var(--color-text-dim)',
};

export function Compare() {
  const params = new URLSearchParams(window.location.search);
  const a = params.get('a') ?? 'previous';
  const b = params.get('b') ?? 'latest';

  const [cmp, setCmp] = useState<RunComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCmp(null);
    setError(null);
    getCompare(a, b)
      .then(setCmp)
      .catch((e: Error) => setError(e.message));
  }, [a, b]);

  const grouped = useMemo(() => {
    if (!cmp) return null;
    const map = new Map<StatusChange, TestComparison[]>();
    for (const t of cmp.tests) {
      const list = map.get(t.statusChange) ?? [];
      list.push(t);
      map.set(t.statusChange, list);
    }
    return map;
  }, [cmp]);

  if (error) {
    return (
      <div className="rounded border border-[color:var(--color-fail)] bg-[color:var(--color-fail)]/10 p-3 text-sm text-[color:var(--color-fail)]">
        {error}
      </div>
    );
  }
  if (!cmp || !grouped) {
    return <div className="text-sm text-[color:var(--color-text-dim)]">loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Compare
        </h1>
        <div className="mt-2 flex items-center gap-3 text-xs text-[color:var(--color-text-dim)]">
          <RunChip run={cmp.runA} />
          <span>→</span>
          <RunChip run={cmp.runB} />
        </div>
      </div>

      {SECTION_ORDER.map((s) => {
        const rows = grouped.get(s);
        if (!rows || rows.length === 0) return null;
        return (
          <section key={s} className="space-y-2">
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: SECTION_COLOR[s] }}
            >
              {SECTION_LABEL[s]}{' '}
              <span className="text-[color:var(--color-text-muted)]">({rows.length})</span>
            </h2>
            <div className="space-y-2">
              {rows.map((t) => (
                <ComparisonCard key={t.key} test={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RunChip({ run }: { run: RunRow }) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="inline-flex items-center gap-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 font-mono hover:border-[color:var(--color-accent)]"
    >
      <span>{run.id}</span>
      <span className="text-[color:var(--color-text-muted)]">{formatDateTime(run.started_at)}</span>
    </Link>
  );
}

function ComparisonCard({ test }: { test: TestComparison }) {
  const [open, setOpen] = useState(test.statusChange === 'regression');
  const showDiff = open && test.a && test.b && test.a.output !== test.b.output;
  return (
    <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-[color:var(--color-surface-hi)]"
      >
        <span style={{ color: SECTION_COLOR[test.statusChange] }} aria-hidden>
          {iconFor(test.statusChange)}
        </span>
        <span className="flex-1">{test.testName}</span>
        <span className="text-[11px] font-mono text-[color:var(--color-text-muted)]">
          {test.provider}
        </span>
        {test.costDelta !== null && Math.abs(test.costDelta) > 1e-7 && (
          <DeltaChip label="cost" value={test.costDelta} format={(v) => formatCost(v)} worseIfPositive />
        )}
        {test.latencyDelta !== null && test.latencyDelta !== 0 && (
          <DeltaChip label="latency" value={test.latencyDelta} format={(v) => formatLatency(v)} worseIfPositive />
        )}
        <span className="text-[color:var(--color-text-muted)]" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {showDiff && (
        <div className="border-t border-[color:var(--color-border)] p-3">
          <DiffViewer
            oldValue={test.a?.output ?? ''}
            newValue={test.b?.output ?? ''}
            leftTitle="previous"
            rightTitle="current"
          />
        </div>
      )}
      {open && !showDiff && test.b && (
        <div className="border-t border-[color:var(--color-border)] p-3">
          <pre className="overflow-auto rounded bg-[color:var(--color-surface-hi)] p-3 font-mono text-xs whitespace-pre-wrap">
            {test.b.output || '(empty)'}
          </pre>
        </div>
      )}
    </div>
  );
}

function DeltaChip({
  label,
  value,
  format,
  worseIfPositive,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  worseIfPositive: boolean;
}) {
  const worse = worseIfPositive ? value > 0 : value < 0;
  const color = worse ? 'var(--color-fail)' : 'var(--color-pass)';
  const sign = value > 0 ? '+' : '';
  return (
    <span className="font-mono text-[11px]" style={{ color }}>
      {label} {sign}{format(value)}
    </span>
  );
}

function iconFor(s: StatusChange): string {
  switch (s) {
    case 'regression':
      return '✗';
    case 'improvement':
      return '✓';
    case 'added':
      return '+';
    case 'removed':
      return '-';
    default:
      return '·';
  }
}
