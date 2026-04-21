# Contributing to PromptForge

Thanks for the interest. PromptForge is young — every early contribution shapes where it goes.

## Getting set up

```bash
git clone https://github.com/ManeeshJupalle/PromptForge.git
cd promptforge
npm install
npm run typecheck
npm run build
node ./bin/promptforge run examples/hello
```

Node 20+ required. The dashboard build needs an extra ~3 seconds on top of the CLI build.

## Running the dashboard in dev

```bash
# terminal 1 — run the Hono server against real data
node ./bin/promptforge ui --port 3939

# terminal 2 — Vite dev server with proxy to 3939
npm run dev:dashboard
```

Open `http://localhost:5173`. Edits to `src/dashboard/**` hot-reload.

## Filing issues

Tag with one of: `bug`, `feature`, `docs`, `dx`, `performance`, `security`.
Include Node version, OS, and the minimal reproduction if it's a bug.

## Pull requests

- Touch one concern per PR. A feature + a refactor + a doc fix in one PR is three PRs.
- Add an entry to `CHANGELOG.md` under `## [Unreleased]`.
- If you add a new assertion type: update `src/core/assertions/index.ts`, add
  a dashboard renderer under `src/dashboard/components/renderers/`, and add
  a doc section under `docs/assertions.md`. Unknown-type fallback in the
  dashboard is intentional — your renderer replaces it.
- If you add a new provider: pricing entry in `src/core/providers/pricing.ts`,
  lazy SDK import following the Anthropic / OpenAI pattern, error message
  that names the env var + doc link.
- `npm run typecheck` must pass. `npm run build` must succeed.
- Don't skip hooks with `--no-verify`.

## Scope

PromptForge is deliberately small for v0.1. Before opening a PR for a large
feature, check [ROADMAP.md](ROADMAP.md) and file a discussion issue first.
Good PR targets right now: error-message polish, new example suites,
documentation improvements, small assertion types, alternative reporters.

## Code style

- TypeScript strict mode. `noUnusedLocals: true`.
- Prefer `const` + named functions over inline arrow expressions for the
  top-level API surface — stack traces read better.
- No comments for what code does. Comments for *why*: the non-obvious
  invariant, the dodged pitfall, the reason a decision went the way it did.
