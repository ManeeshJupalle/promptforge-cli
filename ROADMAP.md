# Roadmap

Post-v0.1.0 direction. Nothing here is promised; PRs welcome for anything that resonates.

## v0.2 — workflow integration

- **Parallel test execution.** Today the runner is sequential. A `concurrency`
  config field exists but is unused. Add a p-limit-style scheduler so suites
  with many independent provider calls don't block on the slowest.
- **Dashboard live updates.** Today `promptforge run` doesn't push to a
  running `promptforge ui`. A WebSocket on the Hono side + a small reducer
  on the client would make pair-programming with the dashboard feel alive.
- **`promptforge init` non-interactive mode.** `--yes` plus flag overrides
  so it works inside Docker builds and CI provisioning scripts.
- **VCS-friendly snapshots.** Optional `snapshots.json` export/import so
  teams can review snapshot diffs in code review. SQLite stays canonical.
- **`promptforge run --bail`** — stop at the first failure.

## v0.3 — scaling the framework

- **Dataset support.** Load fixtures from CSV / JSONL / HF datasets into
  `vars`. Today you inline-map in a TS test file; datasets would be first-class.
- **Judge rubrics as components.** Reusable `llmJudge` rubric files so teams
  can share "is this response safe / helpful / factual" criteria across
  projects.
- **Provider plugins.** A third-party package can export a `Provider` and
  PromptForge picks it up by name. `xai/...`, `mistral/...`, etc. should
  not need to live in this repo.
- **Cost budgets at the suite level.** Fail fast if a run's total cost
  would exceed a ceiling, not just per-test.

## v0.4+ — speculative

- **Record-replay mode.** Cache real provider responses keyed by `(prompt, vars)`
  so a second run against the same inputs is free and deterministic.
- **Diff-driven test selection.** Given a git diff, run only suites whose
  prompts / fixtures / dependencies changed.
- **Web-based authoring.** Create / edit test suites from the dashboard.
  Not a priority — the YAML/TS authoring story is already good.

## Not doing

- **Cloud-hosted PromptForge.** The value proposition is local-first. A
  hosted backend defeats the point. Self-host if you need to share with
  a team.
- **LLM-agent evals.** Agent trajectories are a different problem shape
  (trace graphs, tool-use chains). PromptForge is for single-shot
  prompt-to-output assertions. A sibling tool might exist someday; it
  won't be crammed in here.
- **Native Python port.** Stay focused.
