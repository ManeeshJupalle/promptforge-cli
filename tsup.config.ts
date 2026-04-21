import { defineConfig } from 'tsup';

// Two entries now (Day 4):
//   dist/cli.js    — CLI bundle, referenced by bin/promptforge
//   dist/index.js  — library bundle exporting defineTestSuite + types for
//                    .test.ts files that `import { defineTestSuite } from 'promptforge'`
// Splitting stays off because the library bundle is tiny (identity function +
// type re-exports) and de-duplication buys very little.
export default defineConfig({
  entry: {
    cli: 'src/cli/index.ts',
    index: 'src/index.ts',
  },
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  splitting: false,
  dts: { entry: { index: 'src/index.ts' } },
});
