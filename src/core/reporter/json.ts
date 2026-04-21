import type { RunSummary } from '../runner/index.js';

// --reporter json: emit the full RunSummary to stdout for piping through `jq`
// or machine consumers. Shape mirrors the dashboard's /api/runs/:id response
// so the same client types (src/dashboard/lib/types.ts) can consume it.
export class JsonReporter {
  events() {
    // JSON reporter stays silent during the run — only emits once at the end.
    return {};
  }

  async finalReport(summary: RunSummary): Promise<void> {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  }
}
