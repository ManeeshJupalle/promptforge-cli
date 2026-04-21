import path from 'node:path';
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import type { Database } from './types.js';

export interface MigrationContext {
  projectRoot: string;
}

export interface Migration {
  version: number;
  name: string;
  up: (db: Database, ctx: MigrationContext) => Promise<void> | void;
}

// Forward-only migrations. Add new ones with version = max + 1; never rewrite
// applied ones. Each migration's `up` should be idempotent enough that a
// partial success (before the version row commits) replays cleanly.
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          started_at INTEGER NOT NULL,
          finished_at INTEGER,
          total_tests INTEGER,
          passed INTEGER,
          failed INTEGER,
          total_cost REAL,
          git_commit TEXT,
          config_hash TEXT
        );
        CREATE TABLE IF NOT EXISTS results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          run_id TEXT NOT NULL REFERENCES runs(id),
          test_name TEXT NOT NULL,
          test_file TEXT NOT NULL,
          provider TEXT NOT NULL,
          passed INTEGER NOT NULL,
          output TEXT NOT NULL,
          input_vars TEXT,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          cost REAL,
          latency_ms INTEGER,
          assertions TEXT,
          error TEXT
        );
        CREATE TABLE IF NOT EXISTS snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_file TEXT NOT NULL,
          test_name TEXT NOT NULL,
          provider TEXT NOT NULL,
          output TEXT NOT NULL,
          embedding BLOB,
          created_at INTEGER NOT NULL,
          UNIQUE(test_file, test_name, provider)
        );
        CREATE INDEX IF NOT EXISTS idx_results_run ON results(run_id);
        CREATE INDEX IF NOT EXISTS idx_results_test ON results(test_file, test_name);
      `);
    },
  },
  {
    version: 2,
    name: 'import-legacy-flat-snapshots',
    up: async (db, ctx) => {
      // Day-3 stored snapshots as flat JSON under .promptforge/snapshots/.
      // Walk that tree if it exists, INSERT OR IGNORE into the new table, and
      // delete the directory. Idempotent: rerunning with no directory is a
      // no-op, and ON CONFLICT protects against partial re-imports.
      const dir = path.join(ctx.projectRoot, '.promptforge', 'snapshots');
      const info = await stat(dir).catch(() => null);
      if (!info?.isDirectory()) return;

      interface LegacySnapshot {
        testFile?: string;
        testName?: string;
        provider?: string;
        output?: string;
        embedding?: number[];
        createdAt?: number;
      }
      const rows: Array<[string, string, string, string, Buffer | null, number]> = [];

      async function walk(d: string): Promise<void> {
        const entries = await readdir(d, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(d, ent.name);
          if (ent.isDirectory()) {
            await walk(full);
          } else if (ent.name.endsWith('.json')) {
            try {
              const snap = JSON.parse(await readFile(full, 'utf8')) as LegacySnapshot;
              if (!snap.testFile || !snap.testName || !snap.provider || snap.output === undefined) continue;
              const embBuf = Array.isArray(snap.embedding)
                ? Buffer.from(new Float32Array(snap.embedding).buffer)
                : null;
              rows.push([
                snap.testFile,
                snap.testName,
                snap.provider,
                snap.output,
                embBuf,
                snap.createdAt ?? Date.now(),
              ]);
            } catch {
              // Skip unreadable files — not fatal to the migration.
            }
          }
        }
      }

      await walk(dir);

      if (rows.length > 0) {
        const insert = db.prepare(`
          INSERT OR IGNORE INTO snapshots
            (test_file, test_name, provider, output, embedding, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const tx = db.transaction((items: typeof rows) => {
          for (const r of items) insert.run(...r);
        });
        tx(rows);
      }

      // One source of truth post-migration. Users who inspect the repo after
      // this point see SQLite only. Flag in the Day 4 report.
      await rm(dir, { recursive: true, force: true });
    },
  },
];

export async function runMigrations(db: Database, ctx: MigrationContext): Promise<void> {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const current = currentVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await m.up(db, ctx);
    db.prepare(`INSERT INTO schema_version (version) VALUES (?)`).run(m.version);
  }
}

function currentVersion(db: Database): number {
  const row = db.prepare(`SELECT MAX(version) AS v FROM schema_version`).get() as { v: number | null };
  return row?.v ?? 0;
}
