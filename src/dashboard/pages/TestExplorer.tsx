import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { getTests } from '../lib/api.js';
import type { TestSummary } from '../lib/types.js';
import { Sparkline } from '../components/Sparkline.js';

export function TestExplorer() {
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getTests()
      .then((d) => setTests(d.tests))
      .catch((e: Error) => setError(e.message));
  }, []);

  const grouped = useMemo(() => {
    if (!tests) return null;
    const ft = filter.trim().toLowerCase();
    const matched = ft
      ? tests.filter(
          (t) =>
            t.test_name.toLowerCase().includes(ft) ||
            t.test_file.toLowerCase().includes(ft) ||
            t.provider.toLowerCase().includes(ft),
        )
      : tests;
    const byFile = new Map<string, TestSummary[]>();
    for (const t of matched) {
      const list = byFile.get(t.test_file) ?? [];
      list.push(t);
      byFile.set(t.test_file, list);
    }
    return byFile;
  }, [tests, filter]);

  if (error) {
    return (
      <div className="rounded border border-[color:var(--color-fail)] bg-[color:var(--color-fail)]/10 p-3 text-sm text-[color:var(--color-fail)]">
        {error}
      </div>
    );
  }
  if (!tests || !grouped) {
    return <div className="text-sm text-[color:var(--color-text-dim)]">loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Tests
        </h1>
        <p className="text-sm text-[color:var(--color-text-dim)]">
          Every (test, provider) pair seen across runs. Sparklines show the last 20 runs.
        </p>
      </div>

      <input
        type="text"
        placeholder="filter by test name / file / provider…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-md rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
      />

      {Array.from(grouped.entries()).map(([file, rows]) => (
        <section key={file} className="space-y-2">
          <h2 className="font-mono text-xs text-[color:var(--color-text-muted)]">{file}</h2>
          <div className="divide-y divide-[color:var(--color-border)] overflow-hidden rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
            {rows.map((t) => (
              <TestRow key={`${t.test_name}|${t.provider}`} test={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TestRow({ test }: { test: TestSummary }) {
  const last = test.history[test.history.length - 1];
  const latestPass = last ? last.passed === 1 : null;
  const passCount = test.history.filter((h) => h.passed === 1).length;
  const passRate = test.history.length > 0 ? passCount / test.history.length : null;
  const latestRunId = last?.run_id;
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate">{test.test_name}</div>
        <div className="text-[11px] font-mono text-[color:var(--color-text-muted)]">
          {test.provider}
        </div>
      </div>
      <Sparkline history={test.history.map((h) => ({ passed: h.passed }))} />
      {passRate !== null && (
        <span className="font-mono text-[11px] text-[color:var(--color-text-dim)]">
          {Math.round(passRate * 100)}%
        </span>
      )}
      <span
        className="font-mono text-[11px]"
        style={{
          color:
            latestPass === null
              ? 'var(--color-text-muted)'
              : latestPass
                ? 'var(--color-pass)'
                : 'var(--color-fail)',
        }}
      >
        {latestPass === null ? 'n/a' : latestPass ? 'pass' : 'fail'}
      </span>
      {latestRunId ? (
        <Link
          href={`/runs/${latestRunId}`}
          className="text-[11px] text-[color:var(--color-accent)] hover:underline"
        >
          latest run →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
