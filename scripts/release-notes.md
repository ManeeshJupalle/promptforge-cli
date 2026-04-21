# v0.1.0 — Initial release

PromptForge is Jest for prompts. Write assertions, catch regressions,
ship LLM features with confidence. Built in one week.

## Install

```
npm install -g promptforge
promptforge init
promptforge run
```

Requires Node 20+.

## Highlights

- **10 assertion types**: `contains`, `notContains`, `regex`,
  `jsonSchema`, `semanticSimilarity`, `llmJudge`, `snapshot`, `cost`,
  `latency`, `custom`.
- **5 providers**: Anthropic, OpenAI, Gemini, Ollama, Mock — same test
  file runs against all of them.
- **Run history + compare**: every run recorded to local SQLite.
  `promptforge compare previous latest` shows regressions,
  improvements, output diffs, cost + latency deltas.
- **Self-hostable dashboard**: Vite + React + Hono SPA bound to
  127.0.0.1. Run list, run detail, compare, trends, test explorer.
- **Watch mode + interactive init + JUnit reporter** for CI.
- **MIT licensed**. Zero telemetry. Zero cloud dependency.

## Full changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete additions list.

## Known issues

- Transitive `protobufjs` CVE mitigated via `npm overrides`. `npm
  audit --omit=dev` reports zero production vulnerabilities.
- Node 20 emits a one-time `ExperimentalWarning` from tsx —
  `NODE_OPTIONS="--no-warnings=ExperimentalWarning"` silences it.

## Roadmap

v0.2 will bring parallel test execution, live-updating dashboard,
dataset fixtures, and provider plugins. See
[ROADMAP.md](ROADMAP.md).

## Thanks

To everyone who gave feedback on the assertion API and the reporter
aesthetics. PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
