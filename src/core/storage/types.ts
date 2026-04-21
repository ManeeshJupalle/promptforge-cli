import type { AssertionResult } from '../types/index.js';

// A tiny structural view of the better-sqlite3 API — keeps the native package
// dynamic-imported without leaking its full type surface everywhere.
export interface Database {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  // better-sqlite3's transaction wraps an arbitrary function and returns one
  // with the same call signature. We intentionally use `any` here to keep
  // the wrapper transparent — callers are responsible for their own types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  pragma(pragma: string, opts?: { simple: boolean }): unknown;
  close(): void;
}

export interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  iterate(...params: unknown[]): IterableIterator<unknown>;
}

export interface RunRow {
  id: string;
  started_at: number;
  finished_at: number | null;
  total_tests: number | null;
  passed: number | null;
  failed: number | null;
  total_cost: number | null;
  git_commit: string | null;
  config_hash: string | null;
}

export interface ResultRow {
  id: number;
  run_id: string;
  test_name: string;
  test_file: string;
  provider: string;
  passed: number; // 0 | 1 — SQLite has no boolean type
  output: string;
  input_vars: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost: number | null;
  latency_ms: number | null;
  assertions: string | null;
  error: string | null;
}

export interface SnapshotRow {
  id: number;
  test_file: string;
  test_name: string;
  provider: string;
  output: string;
  embedding: Buffer | null;
  created_at: number;
}

// The shape of results.assertions after JSON.parse. Same as runtime
// AssertionResult — declared separately so we can treat it as DB schema.
// Contract: fields on `details` are ADD-ONLY. Renames/removals require a
// data migration because Day 5's dashboard will render legacy rows too.
export type StoredAssertion = AssertionResult;
