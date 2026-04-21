# CI integration

PromptForge is designed to run in CI as cleanly as it runs on your laptop.

## Principles

- **Exit code 0 on all-pass, 1 on any failure.** Standard CI contract.
- **`--reporter junit`** writes XML that every CI system picks up.
- **`--reporter json`** dumps the full run summary for custom pipelines.
- **`--no-record`** skips DB writes — great for ephemeral CI runners
  that throw the container away after the job.
- **No TTY required.** The CLI reporter detects `process.stdout.isTTY`
  and falls back to plain text — no stuck spinners in job logs.

## GitHub Actions

```yaml
# .github/workflows/prompt-tests.yml
name: Prompt tests

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'promptforge.config.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run prompt tests
        run: npx promptforge run --reporter junit --no-record
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          OPENAI_API_KEY:    ${{ secrets.OPENAI_API_KEY }}

      - name: Upload JUnit report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: promptforge-results
          path: promptforge-results.xml

      - name: Publish to checks UI
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Prompt tests
          path: promptforge-results.xml
          reporter: java-junit
```

Key choices:

- `--no-record` because the CI runner is ephemeral and the SQLite db
  wouldn't survive the job.
- `if: always()` on the upload step so failures still emit an artifact.
- Paths filter on `prompts/**` — don't burn API credit on every push.

## GitLab CI

```yaml
prompt-tests:
  stage: test
  image: node:20
  variables:
    NODE_OPTIONS: "--no-warnings=ExperimentalWarning"
  script:
    - npm ci
    - npx promptforge run --reporter junit --no-record
  artifacts:
    when: always
    reports:
      junit: promptforge-results.xml
    paths:
      - promptforge-results.xml
```

## Cost + performance in CI

- **Keep the `mock` provider** in your test matrix — runs for free,
  catches the assertion-wiring regressions without burning credits.
- **Gate expensive providers** behind a branch check, e.g. only run
  Anthropic/OpenAI on `main` or on PRs labeled `llm-review`.
- **Use `--filter`** to scope runs when a PR only touches one prompt file.

## Capturing output for downstream tools

```bash
# Full run summary for custom scorekeeping.
npx promptforge run --reporter json --no-record > results.json

# Parse with jq:
jq '.regressions | length' results.json
jq '.totalCost' results.json
```

The JSON shape matches the dashboard's `/api/runs/:id` response, so any
dashboard consumer already knows the schema.
