# Dashboard

`promptforge ui` launches a local read-only web UI over
`.promptforge/db.sqlite`. Dark-mode, single-page, no network calls
beyond `127.0.0.1:3939`.

## Security & privacy

- Binds to `127.0.0.1` only — never `0.0.0.0`.
- No auth. Local-only by design. If you need multi-user access, reverse-proxy
  it behind your own auth layer.
- The dashboard is read-only. It never mutates `runs`, `results`, or
  `snapshots` rows — those are written by the CLI.
- No analytics, no telemetry, no external fetch. Google Fonts is the
  one CDN dependency (fonts only); host them locally if that matters.

## Views

### Runs (`/`)

Chronological list of every recorded run. Filters: provider
(substring), status (clean / with failures). Click a row for detail.

### Run detail (`/runs/:id`)

All results for a run, grouped by test file. Click a result to expand:
input vars, raw output, per-assertion breakdown with type-specific
renderers (similarity score, judge reasoning, snapshot deltas, etc.),
token usage, cost, latency.

Top-right: a "compare to previous" link that jumps to the compare view
pre-filled with `a=previous&b=<current-id>`.

### Compare (`/compare?a=X&b=Y`)

Same engine as the CLI's `promptforge compare`. Groups tests into
Regressions, Improvements, Unchanged (pass/fail), Added, Removed.
Each regression opens expanded by default with a side-by-side
`react-diff-viewer` showing the output change; cost/latency deltas
inline.

Query params accept run IDs or the keywords `latest` / `previous`:

```
/compare?a=previous&b=latest
/compare?a=Vm8Xc2lJr3&b=latest
```

### Trends (`/trends`)

Daily aggregates:

- **Cost per day** — line chart of total run cost.
- **Pass / fail per day** — stacked bar.
- **Latency p50 / p95 per day** — line chart (quantiles computed
  server-side since SQLite has no percentile function).

### Test Explorer (`/tests`)

Every `(test, provider)` pair seen across all runs. Last-20-runs
sparkline per row (green bars pass, orange bars fail). Latest-run link
on the right.

## Deep links

Any URL works as an entry point. Refresh `/runs/abc123` and it loads
directly — the SPA fallback routes it to `index.html` and the client
fetches the run.

## Running the dashboard separately from runs

`promptforge run` and `promptforge ui` don't need to run at the same
time. The CLI writes to SQLite; the dashboard reads. Keep a dashboard
open in one terminal and iterate with `promptforge run` in another —
refresh the dashboard to see the new row. (Live WebSocket updates are
on the v0.2 roadmap.)
