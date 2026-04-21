import type {
  RunDetail,
  RunRow,
  RunComparison,
  TestSummary,
  TrendsPayload,
} from './types.js';

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
  }
  return (await res.json()) as T;
}

export async function getRuns(params: {
  limit?: number;
  provider?: string;
  status?: 'pass' | 'fail';
  since?: number;
  until?: number;
} = {}): Promise<{ runs: RunRow[] }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  return json(`/api/runs?${qs.toString()}`);
}

export async function getRun(id: string): Promise<RunDetail> {
  return json(`/api/runs/${encodeURIComponent(id)}`);
}

export async function getCompare(a: string, b: string): Promise<RunComparison> {
  return json(`/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
}

export async function getTests(): Promise<{ tests: TestSummary[] }> {
  return json('/api/tests');
}

export async function getTrends(): Promise<TrendsPayload> {
  return json('/api/trends');
}
