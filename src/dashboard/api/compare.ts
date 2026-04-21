import { Hono } from 'hono';
import { RunNotFoundError, compareRuns } from '../../core/compare/index.js';
import type { Database } from '../../core/storage/types.js';

export function compareRoute(db: Database): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    const a = c.req.query('a');
    const b = c.req.query('b');
    if (!a || !b) {
      return c.json({ error: 'compare requires ?a=...&b=... (run IDs, "latest", or "previous")' }, 400);
    }
    try {
      return c.json(compareRuns(db, a, b));
    } catch (err) {
      if (err instanceof RunNotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  });

  return app;
}
