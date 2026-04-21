import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// sha256 of each test file's contents keyed by relative path. Sliced to
// 16 hex chars — collision-resistant enough to key comparisons between runs
// and short enough to log. Files are sorted so reordering on disk doesn't
// spuriously change the hash.
export async function computeConfigHash(files: string[], cwd: string): Promise<string> {
  const h = createHash('sha256');
  for (const file of [...files].sort()) {
    const content = await readFile(file, 'utf8');
    h.update(path.relative(cwd, file));
    h.update('\0');
    h.update(content);
    h.update('\n');
  }
  return h.digest('hex').slice(0, 16);
}
