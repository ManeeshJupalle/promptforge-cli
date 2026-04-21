import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Server } from 'node:http';
import { closeDb, getDb } from '../core/storage/db.js';
import { runsRoute } from './api/runs.js';
import { compareRoute } from './api/compare.js';
import { testsRoute } from './api/tests.js';
import { trendsRoute } from './api/trends.js';

export interface StartServerOptions {
  projectRoot: string;
  port: number;
  hostname?: string;
}

export interface RunningServer {
  server: Server;
  port: number;
  hostname: string;
  url: string;
  shutdown: () => Promise<void>;
}

// The dashboard assets live next to the compiled CLI: dist/dashboard/
// relative to dist/cli.js. Using import.meta.url makes this work regardless
// of the user's cwd — see Day 5 flagged decision on path resolution.
export function getDashboardDir(): string {
  return fileURLToPath(new URL('./dashboard/', import.meta.url));
}

export async function startServer(opts: StartServerOptions): Promise<RunningServer> {
  const hostname = opts.hostname ?? '127.0.0.1';
  const db = await getDb(opts.projectRoot);

  // Hono + node adapter are dynamic-imported so `promptforge run` and
  // `promptforge list` never pay their load cost.
  const { Hono } = await import('hono');
  const { serve } = await import('@hono/node-server');
  const { serveStatic } = await import('@hono/node-server/serve-static');

  const app = new Hono();

  // API routes must mount first so `/api/*` never falls through to static.
  app.route('/api/runs', runsRoute(db));
  app.route('/api/compare', compareRoute(db));
  app.route('/api/tests', testsRoute(db));
  app.route('/api/trends', trendsRoute(db));

  app.get('/api/health', (c) => c.json({ ok: true, projectRoot: opts.projectRoot }));

  const dashboardDir = getDashboardDir();
  const dashboardOk = await stat(dashboardDir).catch(() => null);
  if (!dashboardOk?.isDirectory()) {
    throw new Error(
      `Dashboard assets not found at ${dashboardDir} — run \`npm run build:dashboard\` (or \`npm run build\`) first.`,
    );
  }

  // Hono's serveStatic falls through when a file doesn't exist, so the SPA
  // fallback below catches deep links like /runs/abc123 and rewrites them
  // to index.html without breaking real asset URLs.
  app.use(
    '/*',
    serveStatic({
      root: dashboardDir,
      // serveStatic from @hono/node-server resolves relative to process.cwd()
      // unless `root` is absolute. We pass an absolute path, which it respects.
    }),
  );

  const indexPath = path.join(dashboardDir, 'index.html');
  let indexCache: string | null = null;
  const getIndexHtml = async (): Promise<string> => {
    if (indexCache === null) indexCache = await readFile(indexPath, 'utf8');
    return indexCache;
  };

  app.notFound(async (c) => {
    // Don't mask genuine API 404s with index.html — the API would have
    // written a JSON error above already, so this block only fires for
    // client-side routes the browser navigated to.
    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: 'not found' }, 404);
    }
    return c.html(await getIndexHtml());
  });

  const server = await new Promise<Server>((resolve, reject) => {
    const s = serve({ fetch: app.fetch, port: opts.port, hostname }, (info) => {
      resolve(s as unknown as Server);
      void info;
    });
    s.on?.('error', reject);
  });

  const url = `http://${hostname}:${opts.port}`;

  const shutdown = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    closeDb(opts.projectRoot);
  };

  return { server, port: opts.port, hostname, url, shutdown };
}
