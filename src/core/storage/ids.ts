import { nanoid } from 'nanoid';

// 10 chars of URL-safe alphabet. Collision probability at 1 run/second for a
// year is ~1 in 10^8 — fine for a local run history that rarely exceeds
// thousands of rows.
export function newRunId(): string {
  return nanoid(10);
}
