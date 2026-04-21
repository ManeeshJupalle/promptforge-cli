import { Hono } from 'hono';
import {
  getResultsForRun,
  getRun,
  listRunsFiltered,
  parseStoredAssertions,
  type RunsFilter,
} from '../../core/storage/queries.js';
import type { Database, ResultRow } from '../../core/storage/types.js';

// Results on the wire carry parsed `assertions` and `inputVars` — the client
// shouldn't have to re-parse JSON strings.
export interface ResultDTO extends Omit<ResultRow, 'assertions' | 'input_vars'> {
  assertions: ReturnType<typeof parseStoredAssertions>;
  input_vars: unknown;
}

export function runsRoute(db: Database): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const filter: RunsFilter = {
      limit: intParam(c.req.query('limit'), 50),
      offset: intParam(c.req.query('offset'), 0),
      provider: c.req.query('provider') || undefined,
      status: (c.req.query('status') as RunsFilter['status']) || undefined,
      since: intParam(c.req.query('since')),
      until: intParam(c.req.query('until')),
    };
    const runs = listRunsFiltered(db, filter);
    return c.json({ runs });
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const run = getRun(db, id);
    if (!run) return c.json({ error: 'run not found' }, 404);
    const results: ResultDTO[] = getResultsForRun(db, id).map((r) => ({
      ...r,
      assertions: parseStoredAssertions(r.assertions),
      input_vars: safeJsonParse(r.input_vars),
    }));
    return c.json({ run, results });
  });

  return app;
}

function intParam(value: string | undefined, fallback?: number): number | undefined {
  if (value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
