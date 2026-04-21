import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getTrends } from '../lib/api.js';
import type { TrendsPayload } from '../lib/types.js';

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  color: '#fafafa',
  fontSize: 12,
};

export function Trends() {
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrends()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded border border-[color:var(--color-fail)] bg-[color:var(--color-fail)]/10 p-3 text-sm text-[color:var(--color-fail)]">
        {error}
      </div>
    );
  }
  if (!data) return <div className="text-sm text-[color:var(--color-text-dim)]">loading…</div>;

  const hasData = data.byDay.length > 0 || data.latency.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Trends
        </h1>
        <p className="text-sm text-[color:var(--color-text-dim)]">
          Per-day aggregates across every run in <code className="font-mono">.promptforge/db.sqlite</code>.
        </p>
      </div>

      {!hasData && (
        <div className="rounded border border-dashed border-[color:var(--color-border)] p-8 text-center text-sm text-[color:var(--color-text-dim)]">
          No completed runs yet.
        </div>
      )}

      {data.byDay.length > 0 && (
        <ChartCard title="Cost per day (USD)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.byDay}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total_cost" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {data.byDay.length > 0 && (
        <ChartCard title="Pass / fail per day">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byDay}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
              <Bar dataKey="passed" stackId="a" fill="#10b981" />
              <Bar dataKey="failed" stackId="a" fill="#F97316" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {data.latency.length > 0 && (
        <ChartCard title="Latency p50 / p95 per day (ms)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.latency}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
              <Line type="monotone" dataKey="p50" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="p95" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <h2 className="mb-3 text-sm font-medium text-[color:var(--color-text-dim)]">{title}</h2>
      {children}
    </div>
  );
}
