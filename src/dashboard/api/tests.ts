import { Hono } from 'hono';
import {
  getTestHistory,
  listDistinctTests,
  type TestHistoryPoint,
} from '../../core/storage/queries.js';
import type { Database } from '../../core/storage/types.js';

export interface TestSummary {
  test_file: string;
  test_name: string;
  provider: string;
  history: TestHistoryPoint[];
}

export function testsRoute(db: Database): Hono {
  const app = new Hono();

  // One row per (file, name, provider). History is the last 20 runs ordered
  // oldest→newest so sparkline rendering reads left-to-right.
  app.get('/', (c) => {
    const distinct = listDistinctTests(db);
    const tests: TestSummary[] = [];
    for (const d of distinct) {
      const providers = d.providers.split(',');
      for (const provider of providers) {
        tests.push({
          test_file: d.test_file,
          test_name: d.test_name,
          provider,
          history: getTestHistory(db, d.test_file, d.test_name, provider, 20),
        });
      }
    }
    return c.json({ tests });
  });

  return app;
}
