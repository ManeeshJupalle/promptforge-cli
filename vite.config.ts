import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite root is the dashboard source directory so the index.html entry + ESM
// module graph live beside the React code. Output goes to dist/dashboard/
// (relative to the project root) so tsup's CLI bundle at dist/cli.js can
// locate it via `new URL('./dashboard/', import.meta.url)`.
export default defineConfig({
  root: path.resolve(__dirname, 'src/dashboard'),
  base: './',
  plugins: [react(), tailwindcss()],
  css: {
    // Pin PostCSS to an empty config so Vite doesn't walk up the directory
    // tree looking for one — on Windows, a stray postcss.config.js at the
    // drive root will otherwise get picked up. Tailwind v4 uses @tailwindcss/vite,
    // not PostCSS, so there's nothing to configure here.
    postcss: { plugins: [] },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/dashboard'),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      // Dev-mode convenience: `npm run dev:dashboard` proxies /api/* to a
      // locally-running Hono server on 3939 so you can iterate on the client
      // without rebuilding the CLI.
      '/api': 'http://localhost:3939',
    },
  },
});
