# CLI reference

```
promptforge <command> [options]
```

Run `promptforge --help` for the auto-generated short form, or
`promptforge <command> --help` for per-command flags.

---

## `promptforge run [paths...]`

Execute tests. Records the run to `.promptforge/db.sqlite` unless
`--no-record` is set.

| Flag | Description |
|------|-------------|
| `-f, --filter <pattern>` | Only run tests whose name includes `<pattern>`. |
| `-p, --provider <name>` | Only run providers matching `<name>` (substring). |
| `-r, --reporter <kind>` | `cli` (default), `json`, or `junit`. |
| `-o, --output <path>` | Output file for the `junit` reporter. Default `promptforge-results.xml`. |
| `--no-record` | Skip DB writes. Regression detection becomes a no-op. |
| `--update-snapshots` | Accept current outputs as new golden snapshots during the run. |

Paths can be file globs or directories. No paths = discover everything
from the cwd.

---

## `promptforge watch [paths...]`

Re-run tests on change. Interactive keys:

| Key | Action |
|-----|--------|
| `a` | Run all tests. |
| `f` | Run only tests that failed in the last iteration. |
| `p` | Enter a substring pattern filter. |
| `↵` | Re-run whatever ran last. |
| `q` / `Ctrl-C` | Quit (restores terminal rawMode cleanly). |

Debounced 200ms. Watches every test file, every referenced prompt
file, and `promptforge.config.ts`. Does **not** record iterations to
SQLite by default (opt in with `--record`).

| Flag | Description |
|------|-------------|
| `--record` | Record every watch iteration to `.promptforge/db.sqlite`. |

---

## `promptforge init`

Interactive scaffolder. Four questions:

1. Test directory (default `prompts`).
2. Providers to enable (multi-select).
3. Create an example test? (default yes).
4. Add `.promptforge/` to `.gitignore`? (default yes).

Idempotent — if `promptforge.config.ts` already exists, you get a
Skip / Overwrite / Backup prompt.

---

## `promptforge ui`

Launch the dashboard. Binds to `127.0.0.1` only.

| Flag | Description |
|------|-------------|
| `-p, --port <port>` | Port to bind. Default `3939`. |
| `--no-open` | Skip automatic browser launch (CI / Docker). |

Reads `.promptforge/db.sqlite` in the current directory. Dashboard
assets are served from the installed package's `dist/dashboard/`
directory — this works whether PromptForge is installed globally,
locally, or linked.

---

## `promptforge compare <a> <b>`

Diff two runs. `<a>` and `<b>` accept:

- Run IDs (e.g. `V1StGXR8_Z`)
- `latest` — most recent completed run
- `previous` — the run before the latest

```bash
promptforge compare previous latest
```

Output groups tests by status: Regressions, Improvements, Unchanged
(pass/fail), Added, Removed. Shows unified output diffs with
cost + latency deltas.

---

## `promptforge snapshot`

Manage golden snapshots stored in the SQLite `snapshots` table.

| Flag | Description |
|------|-------------|
| `--update` | Re-run tests and accept all outputs as the new golden. |
| `--clear <pattern>` | Delete snapshots whose file / name / provider contains `<pattern>` (case-insensitive). |
| `--force` | Required when `--clear` would remove more than 5 snapshots. |
| `-f, --filter <pattern>` | Scope `--update` to tests matching `<pattern>`. |
| `-p, --provider <name>` | Scope `--update` to providers matching `<name>`. |

---

## `promptforge list [paths...]`

Show every discovered test file and the cases inside. Useful for
verifying `prompt:` paths resolve and that filters / globs match what
you expected.

---

## Environment variables

| Variable | Used by |
|----------|---------|
| `ANTHROPIC_API_KEY` | `anthropic/*` providers |
| `OPENAI_API_KEY` | `openai/*` providers |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | `gemini/*` providers |
| `OLLAMA_HOST` | `ollama/*` providers (default `http://localhost:11434`) |
| `NODE_OPTIONS=--no-warnings=ExperimentalWarning` | Silences Node 20's tsx register warning |
