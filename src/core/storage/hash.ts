import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// sha256 of every file that can change the recorded run's behavior, keyed by
// relative path. Inputs are sorted so reordering on disk doesn't spuriously
// change the hash. Missing files are folded in as a deterministic "(missing)"
// sentinel so a deleted-then-recreated prompt changes the hash.
//
// Callers should pass every file whose contents affect a run's outcome: the
// test-suite files themselves, every referenced prompt, and — if present —
// `promptforge.config.ts`. Sliced to 16 hex chars for compact log display.
export async function computeConfigHash(files: string[], cwd: string): Promise<string> {
  const h = createHash('sha256');
  const unique = Array.from(new Set(files)).sort();
  for (const file of unique) {
    h.update(path.relative(cwd, file));
    h.update('\0');
    try {
      h.update(await readFile(file, 'utf8'));
    } catch {
      // Prompt file referenced by a suite but missing on disk. Fold that
      // into the hash explicitly — callers can still distinguish "file
      // content X" from "file absent" between runs.
      h.update('(missing)');
    }
    h.update('\n');
  }
  return h.digest('hex').slice(0, 16);
}
