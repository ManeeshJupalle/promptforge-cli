import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { Database } from './types.js';
import { runMigrations } from './migrations.js';

// One connection per project root so tests in different working directories
// don't collide. better-sqlite3 is dynamic-imported — runs that never touch
// storage (list / init / help) don't pay its native load cost.
type DbEntry = { db: Database; initPromise: Promise<void> };
const cache = new Map<string, DbEntry>();

export async function getDb(projectRoot: string): Promise<Database> {
  const absRoot = path.resolve(projectRoot);
  const existing = cache.get(absRoot);
  if (existing) {
    await existing.initPromise;
    return existing.db;
  }

  const dir = path.join(absRoot, '.promptforge');
  await mkdir(dir, { recursive: true });

  const mod = await import('better-sqlite3');
  const Ctor = mod.default as unknown as new (filename: string) => Database;
  const db = new Ctor(path.join(dir, 'db.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const initPromise = runMigrations(db, { projectRoot: absRoot });
  cache.set(absRoot, { db, initPromise });
  await initPromise;
  return db;
}

export function closeDb(projectRoot: string): void {
  const absRoot = path.resolve(projectRoot);
  const entry = cache.get(absRoot);
  if (entry) {
    entry.db.close();
    cache.delete(absRoot);
  }
}
