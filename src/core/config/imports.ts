import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Walks the relative-import graph of a TypeScript entry file and returns every
// file it transitively reaches (including the entry). Only follows specifiers
// that start with `.` or `..` — bare package imports (`fs`, `lodash`) are
// treated as black boxes because we can't guarantee we'd resolve them the
// same way Node does and we're not trying to hash user dependencies anyway.
//
// Uses a regex-based parser rather than the TypeScript compiler for speed
// and zero-dep simplicity. It will miss dynamic imports with non-literal
// specifiers and other esoteric constructs, but those are rare in test
// fixtures and the blast radius is limited to "watch mode doesn't trip on
// edits to this file" (user can always restart to pick up changes).
export async function collectRelativeImports(
  entry: string,
): Promise<Set<string>> {
  const visited = new Set<string>();
  const stack: string[] = [entry];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);

    let source: string;
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue;
    }

    for (const spec of extractRelativeSpecifiers(source)) {
      const resolved = resolveRelativeImport(spec, file);
      if (resolved && !visited.has(resolved)) stack.push(resolved);
    }
  }
  return visited;
}

// Relative specifiers appearing in: static imports, dynamic `import(...)`,
// and re-exports (`export ... from '...'`). Block/line comments are stripped
// first so commented-out imports don't pollute the graph.
function extractRelativeSpecifiers(source: string): string[] {
  const cleaned = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const out: string[] = [];
  const patterns = [
    // `import ... from '...'` and `export ... from '...'`
    /(?:import|export)\s[\s\S]*?\sfrom\s+['"](\.\.?\/[^'"]+)['"]/g,
    // bare side-effect imports: `import './setup'`
    /import\s+['"](\.\.?\/[^'"]+)['"]/g,
    // dynamic imports with literal specifiers
    /import\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(cleaned)) !== null) {
      out.push(m[1]);
    }
  }
  return out;
}

// Mirrors Node/TSX resolution for relative imports. First hit wins.
// Returns null if nothing resolves (typo'd import, bare package, or a
// purely-runtime-resolved specifier we shouldn't follow).
//
// Three probe shapes, in order:
//   1. The specifier as written, and with each extension appended.
//   2. If the specifier already has a JS extension (`.js`, `.mjs`, `.cjs`,
//      `.jsx`), swap it for the TS equivalent — this handles the modern
//      TS-ESM convention where users write `./helper.js` but the file on
//      disk is `./helper.ts`.
//   3. Treat it as a directory and look for `index.*`.
const RESOLVE_EXTS = ['', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const INDEX_EXTS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const JS_TO_TS: Record<string, string[]> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

function resolveRelativeImport(spec: string, fromFile: string): string | null {
  const baseDir = path.dirname(fromFile);
  const abs = path.resolve(baseDir, spec);

  for (const ext of RESOLVE_EXTS) {
    const candidate = abs + ext;
    if (existsSync(candidate)) return candidate;
  }

  const specExt = path.extname(abs);
  const tsSwaps = JS_TO_TS[specExt];
  if (tsSwaps) {
    const stem = abs.slice(0, -specExt.length);
    for (const swap of tsSwaps) {
      const candidate = stem + swap;
      if (existsSync(candidate)) return candidate;
    }
  }

  for (const ext of INDEX_EXTS) {
    const candidate = path.join(abs, 'index' + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
