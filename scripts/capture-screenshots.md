# Capturing dashboard screenshots for the landing page / README

The landing page (`docs/index.html`) and README reference images under
`docs/images/`. This file documents the exact sequence that produces the
best screenshots.

All images should be **1440×900** PNGs, dark theme, full-width. Trim
any browser chrome (use Cmd+Shift+4 then spacebar on macOS to snap a
window without chrome).

## Prep

```bash
# Work from a project with reasonable history — the examples/ directory
# is perfect because it exercises every assertion type.
cd /path/to/promptforge
rm -rf .promptforge
npm run build

# Generate a few runs so the dashboard has data to render.
node ./bin/promptforge run examples/customer-support
node ./bin/promptforge run examples/code-review
node ./bin/promptforge run examples/extraction

# Introduce one regression for the compare shot.
sed -i '' 's/billing/blling/' examples/customer-support/triage.test.yaml
node ./bin/promptforge run examples/customer-support
# Revert so the repo stays clean.
git checkout examples/customer-support/triage.test.yaml

# Launch the dashboard.
node ./bin/promptforge ui --port 3939
```

## Screenshots to take

### 1. `docs/images/dashboard-runs.png`

Open `http://127.0.0.1:3939/`. The runs list should show 4 rows with
1 failing (the regression you introduced). Capture the viewport.

### 2. `docs/images/dashboard-run-detail.png`

Click the most recent run. Expand 2 test cards (one pass, one fail)
so the AssertionRow diagnostics are visible. Capture.

### 3. `docs/images/dashboard-compare.png`

Navigate to `/compare?a=previous&b=latest`. The regressions section
should be expanded with the react-diff-viewer showing a diff. Capture.

### 4. `docs/images/dashboard-trends.png`

Navigate to `/trends`. All three charts should render (cost, pass/fail
stacked bar, latency p50/p95). Capture.

## Save and commit

```bash
git add docs/images/*.png
git commit -m "docs: add dashboard screenshots for landing page"
```

The landing page's screenshot cards have `onerror` fallbacks, so a
missing image shows "Screenshot coming soon" rather than a broken
image icon — but for the launch, all four should exist.
