# Changelog

All notable changes to PromptForge will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet. See [ROADMAP.md](ROADMAP.md) for what's planned.

## [0.1.0] - 2026-04-27

Initial public release. Built in one week.

### Added

**Core**

- CLI: `promptforge run | watch | list | init | snapshot | compare | ui`.
- Test files: `*.test.yaml` for static, `*.test.ts` for dynamic
  (`defineTestSuite({...})` accepts closures, imports, fixtures).
- Provider registry: Anthropic, OpenAI, Gemini, Ollama, and a first-class
  `mock` provider. API keys lazy-loaded on first call; providers dynamic-imported.
- Mustache-style `{{variable}}` templating in prompts, including dot paths.
- Retry with exponential backoff + jitter on 429 / 5xx / network errors.
- Per-provider pricing table + automatic cost tracking on every completion.

**Assertions**

- `contains`, `notContains`, `regex`, `jsonSchema` (Ajv-backed),
  `semanticSimilarity` (local all-MiniLM-L6-v2 embeddings via transformers.js),
  `llmJudge` (configurable judge model + JSON-scored rubric), `snapshot`
  (embedding-similarity drift detection), `cost`, `latency`, and `custom`
  (function-valued assertions in TS test files).

**Storage & history**

- SQLite at `.promptforge/db.sqlite` with forward-only migrations.
- Run history: `runs`, `results`, `snapshots` tables. Every `promptforge run`
  records a row with `git_commit`, `config_hash`, per-test assertions serialized
  as JSON.
- `promptforge compare <a> <b>` — regressions, improvements, unchanged, added,
  removed; unified diff of outputs; cost + latency deltas.
- Automatic regression summary at the end of every run.
- `--no-record` flag on `run` / watch mode defaults — skip DB writes for
  iteration-heavy workflows.

**Dashboard**

- Vite + React 18 + Tailwind v4 SPA bundled into `dist/dashboard/`.
- Pages: Runs, Run Detail, Compare, Trends, Test Explorer.
- Hono server, local-only bind (127.0.0.1), SPA fallback for deep links.
- Per-assertion-type renderers with a JSON fallback for future types.

**DX**

- TTY-aware CLI reporter: ora spinner during each test, boxen-framed
  failure cards grouped at the end, framed summary footer. Gracefully
  degrades to plain text in CI.
- Interactive `promptforge init` scaffolder (@inquirer/prompts).
- Watch mode with interactive keys: `a` run all, `f` failed only,
  `p` pattern filter, `↵` re-run, `q` quit.
- JUnit XML + JSON reporters (`--reporter junit|json`).
- Actionable error messages across every throw site (missing env vars link
  to provider key-issuance pages; YAML syntax errors include line + column;
  Ollama unreachable names `OLLAMA_HOST` and `ollama serve`).

### Known Issues

- **Transitive vulnerability advisory for `protobufjs`** (via
  `@xenova/transformers` → `onnxruntime-web`). Patched at the resolution
  level with an npm `overrides` pin to `^7.5.5` — `npm audit --omit=dev`
  reports zero production vulnerabilities. See
  [docs/known-issues.md](docs/known-issues.md) for threat-model notes.
- **Dev-only vulnerabilities** (2 moderate, Vite chain) pending upstream
  fixes — no impact on published tool or users.
- **Node 20 `tsx/esm/api.register()`** emits a one-time
  `ExperimentalWarning`. Silence via `--no-warnings=ExperimentalWarning`.
  Clean on Node 22+.
- **Programmatic SIGINT on Windows** bypasses user signal handlers (Node
  platform behavior). Real-terminal `Ctrl-C` routes through shutdown
  handlers correctly; this only affects scripted `child.kill()` scenarios.

[Unreleased]: https://github.com/ManeeshJupalle/PromptForge/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ManeeshJupalle/PromptForge/releases/tag/v0.1.0
