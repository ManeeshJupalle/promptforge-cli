# 🔥 PromptForge — The Testing Framework for LLM Prompts

**Jest for prompts.** Drop it into any project with LLM calls, write test files in YAML or TypeScript, and run with a beautiful CLI that catches regressions before they hit production.

---

## Why This Exists

Anyone can wire up an LLM API call. The hard part is knowing when your prompt *silently got worse*. Teams ship prompt changes with the same rigor they ship untested production code — by vibing. PromptForge fixes that.

**Core principles:**

- **Test-driven prompting.** Write assertions before you ship.
- **Local-first.** Works with Ollama for free dev iteration. Paid models only when you need them.
- **Multi-provider.** One test file runs against Anthropic, OpenAI, Ollama, and Gemini.
- **Beautiful DX.** CLI output worthy of Jest. Dashboard worthy of Linear.
- **Self-hostable.** No SaaS lock-in. Your test runs stay on your machine.

---

## The Killer Features

### Test file DX (YAML)

```yaml
# prompts/customer-support/triage.test.yaml
prompt: ./triage.md
providers:
  - anthropic/claude-sonnet-4-6
  - openai/gpt-4o-mini
  - ollama/llama3.2

tests:
  - name: classifies billing complaint
    vars:
      message: "I was charged twice for my subscription"
    assert:
      - type: contains
        value: "billing"
      - type: jsonSchema
        schema:
          type: object
          required: [category, urgency]
          properties:
            category: { enum: [billing, technical, account, other] }
            urgency: { enum: [low, medium, high] }
      - type: llmJudge
        criteria: "Response correctly identifies this as a billing issue and suggests refund review"
      - type: cost
        max: 0.002
      - type: latency
        maxMs: 3000

  - name: handles vague message gracefully
    vars:
      message: "help"
    assert:
      - type: semanticSimilarity
        expected: "Could you provide more details about your issue?"
        threshold: 0.75
      - type: notContains
        value: "error"
```

### Test file DX (TypeScript — for dynamic/programmatic tests)

```typescript
// prompts/customer-support/triage.test.ts
import { defineTestSuite } from 'promptforge';
import { loadFixtures } from './fixtures';

export default defineTestSuite({
  prompt: './triage.md',
  providers: ['anthropic/claude-sonnet-4-6'],

  // Dynamically generate tests from fixtures
  tests: loadFixtures().map((fixture) => ({
    name: `classifies ${fixture.category}`,
    vars: { message: fixture.message },
    assert: [
      { type: 'contains', value: fixture.expectedCategory },
      { type: 'custom', fn: (output) => output.length > 20 },
    ],
  })),
});
```

### The CLI

```bash
$ promptforge run

🧪 PromptForge v0.1.0

PASS  prompts/customer-support/triage.test.yaml
  ✓ classifies billing complaint (anthropic/claude-sonnet-4-6) 412ms $0.0008
  ✓ classifies billing complaint (openai/gpt-4o-mini) 298ms $0.0001
  ✗ handles vague message gracefully (openai/gpt-4o-mini) 189ms $0.0001

    semanticSimilarity assertion failed
    expected similarity >= 0.75, got 0.68

    Expected: "Could you provide more details about your issue?"
    Received: "What's up? How can I help?"

Tests:       2 passed, 1 failed, 3 total
Providers:   anthropic, openai
Cost:        $0.0018
Duration:    1.2s

Run `promptforge ui` to investigate failures →
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                           CLI                                │
│  init │ run │ watch │ compare │ ui │ list │ snapshot         │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────▼────────┐         ┌─────────────────┐
       │  Config Loader  │────────▶│ YAML + TS       │
       │                 │         │ test discovery  │
       └───────┬────────┘         └─────────────────┘
               │
       ┌───────▼────────┐
       │  Test Runner    │  parallel · retries · streaming
       └───────┬────────┘
               │
   ┌───────────┼──────────────────┐
   │           │                  │
┌──▼────────┐┌─▼──────────┐┌──────▼──────┐
│ Provider  ││ Assertion  ││   Storage   │
│  Layer    ││  Engine    ││  (SQLite)   │
└─────┬─────┘└──────┬─────┘└──────┬──────┘
      │             │             │
  Anthropic     contains      runs
  OpenAI        regex         results
  Ollama        jsonSchema    snapshots
  Gemini        semanticSim   cost_history
                llmJudge      providers
                snapshot
                cost/latency
                custom
                              ┌───────────────┐
                              │  Dashboard     │
                              │  (Vite+React)  │
                              │                │
                              │ bundled via    │
                              │ `promptforge   │
                              │     ui`        │
                              └───────────────┘
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Language | TypeScript (Node 20+) |
| CLI framework | Commander.js |
| CLI aesthetics | chalk, ora, cli-table3, boxen |
| Config parsing | js-yaml (YAML), tsx (TS config loader) |
| LLM providers | @anthropic-ai/sdk, openai, @google/generative-ai, fetch (Ollama) |
| Embeddings (semantic assertions) | @xenova/transformers (local, all-MiniLM-L6-v2) |
| Storage | better-sqlite3 |
| Dashboard | Vite + React 18 + TailwindCSS |
| Dashboard server | Hono (embedded, spawned by CLI) |
| Charts | Recharts |
| Diff rendering | diff + react-diff-viewer-continued |
| Schema validation | Zod |
| Build | tsup (CLI), Vite (dashboard) |

---

## Project Structure

```
promptforge/
├── bin/
│   └── promptforge                 # CLI entry point shebang
├── src/
│   ├── cli/
│   │   ├── index.ts                # main CLI entry
│   │   └── commands/
│   │       ├── init.ts             # scaffold new project
│   │       ├── run.ts              # execute tests
│   │       ├── watch.ts            # watch mode
│   │       ├── compare.ts          # diff two runs
│   │       ├── ui.ts               # launch dashboard
│   │       ├── list.ts             # list all discovered tests
│   │       └── snapshot.ts         # manage snapshots
│   ├── core/
│   │   ├── config/
│   │   │   ├── loader.ts           # discover + load test files
│   │   │   ├── yaml.ts             # YAML parser + schema
│   │   │   ├── typescript.ts       # TS config loader via tsx
│   │   │   └── schema.ts           # Zod schemas
│   │   ├── runner/
│   │   │   ├── index.ts            # orchestrator
│   │   │   ├── executor.ts         # per-test execution
│   │   │   └── parallelism.ts      # concurrency control
│   │   ├── providers/
│   │   │   ├── index.ts            # provider registry
│   │   │   ├── base.ts             # Provider interface
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   ├── ollama.ts
│   │   │   ├── gemini.ts
│   │   │   └── pricing.ts          # per-model cost tables
│   │   ├── assertions/
│   │   │   ├── index.ts            # assertion registry
│   │   │   ├── contains.ts
│   │   │   ├── regex.ts
│   │   │   ├── jsonSchema.ts
│   │   │   ├── semanticSimilarity.ts
│   │   │   ├── llmJudge.ts
│   │   │   ├── snapshot.ts
│   │   │   ├── costLatency.ts
│   │   │   └── custom.ts
│   │   ├── storage/
│   │   │   ├── db.ts               # SQLite setup
│   │   │   ├── migrations.ts
│   │   │   └── queries.ts
│   │   ├── reporter/
│   │   │   ├── cli.ts              # terminal output formatter
│   │   │   ├── json.ts             # machine-readable
│   │   │   └── junit.ts            # CI integration
│   │   └── types/
│   │       └── index.ts
│   └── dashboard/
│       ├── server.ts               # Hono API server
│       ├── api/
│       │   ├── runs.ts
│       │   ├── tests.ts
│       │   └── compare.ts
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── RunList.tsx
│       │   ├── DiffViewer.tsx
│       │   ├── CompareView.tsx
│       │   ├── TrendChart.tsx
│       │   └── TestDrilldown.tsx
│       └── pages/
│           ├── Runs.tsx
│           ├── Compare.tsx
│           └── Trends.tsx
├── examples/
│   ├── customer-support/
│   │   ├── triage.md
│   │   ├── triage.test.yaml
│   │   └── fixtures.ts
│   └── code-review/
│       ├── reviewer.md
│       └── reviewer.test.yaml
├── package.json
├── tsconfig.json
├── tsup.config.ts                  # CLI build
├── vite.config.ts                  # dashboard build
├── README.md
└── .gitignore
```

---

## CLI Surface (Full Reference)

```bash
# Scaffold a new PromptForge project in current directory
promptforge init

# Run all tests (auto-discovers *.test.yaml and *.test.ts)
promptforge run
promptforge run prompts/customer-support/  # specific path
promptforge run --provider anthropic        # filter providers
promptforge run --filter "billing"          # filter test names
promptforge run --reporter json             # machine-readable output

# Watch mode — re-runs on file changes
promptforge watch

# Compare two historical runs (by ID or "latest"/"previous")
promptforge compare previous latest
promptforge compare abc123 def456

# Launch the web dashboard (spawns Hono server + opens browser)
promptforge ui
promptforge ui --port 3939

# List all discovered tests without running
promptforge list

# Snapshot management
promptforge snapshot --update         # accept new outputs as golden
promptforge snapshot --clear <test>   # clear specific snapshot
```

---

## Assertion Types (Complete Spec)

Every assertion returns `{ passed: boolean, message?: string, details?: any }`.

### 1. `contains` / `notContains`
```yaml
- type: contains
  value: "billing"
  caseSensitive: false  # optional, default false
```

### 2. `regex`
```yaml
- type: regex
  pattern: "^\\{.*\\}$"
  flags: "s"  # optional
```

### 3. `jsonSchema`
Validates output against JSON Schema. Uses Ajv under the hood.
```yaml
- type: jsonSchema
  schema:
    type: object
    required: [category, urgency]
```

### 4. `semanticSimilarity`
Uses local `all-MiniLM-L6-v2` via transformers.js. Computes cosine similarity.
```yaml
- type: semanticSimilarity
  expected: "Please provide more details"
  threshold: 0.75
```

### 5. `llmJudge`
Uses an LLM to grade the output against criteria. Returns pass/fail with reasoning.
```yaml
- type: llmJudge
  criteria: "Response is empathetic and offers next steps"
  judgeModel: anthropic/claude-sonnet-4-6  # optional, default uses cheapest available
  threshold: 4  # minimum score 1-5
```

Prompt used for judge (structured output):
```
You are an evaluator. Grade the following output against the criteria.
Criteria: {criteria}
Output: {output}
Respond in JSON: { "score": 1-5, "reasoning": "..." }
```

### 6. `snapshot`
Records output on first run. Fails on subsequent runs if output drifts beyond threshold.
```yaml
- type: snapshot
  similarity: 0.9  # required semantic similarity to stored snapshot
```

Update snapshots with `promptforge snapshot --update`.

### 7. `cost` / `latency`
```yaml
- type: cost
  max: 0.002  # USD
- type: latency
  maxMs: 3000
```

### 8. `custom` (TS config only)
```typescript
{
  type: 'custom',
  fn: async (output, context) => {
    return { passed: output.length > 20, message: 'Too short' };
  },
}
```

---

## Provider Interface

```typescript
// src/core/providers/base.ts
export interface Provider {
  name: string;              // e.g. "anthropic/claude-sonnet-4-6"

  complete(params: {
    prompt: string;
    vars: Record<string, unknown>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<CompletionResult>;
}

export interface CompletionResult {
  output: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;              // computed from pricing.ts
  latencyMs: number;
  raw?: unknown;             // full provider response for debugging
}
```

**Templating:** Prompts use `{{variable}}` syntax (Mustache-style). Vars are substituted before being sent to the provider.

**Pricing table example** (`src/core/providers/pricing.ts`):
```typescript
export const PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-6': { input: 3.00, output: 15.00 },  // per 1M tokens
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'ollama/llama3.2': { input: 0, output: 0 },
  // ...
};
```

Note: pricing tables will need periodic updating; include a comment in the file pointing to provider pricing pages.

---

## Storage Schema (SQLite)

```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,            -- short UUID
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  total_tests INTEGER,
  passed INTEGER,
  failed INTEGER,
  total_cost REAL,
  git_commit TEXT,                -- auto-detected if in git repo
  config_hash TEXT                -- hash of test files at run time
);

CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT REFERENCES runs(id),
  test_name TEXT NOT NULL,
  test_file TEXT NOT NULL,
  provider TEXT NOT NULL,
  passed INTEGER NOT NULL,        -- 0 or 1
  output TEXT NOT NULL,
  input_vars TEXT,                -- JSON
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost REAL,
  latency_ms INTEGER,
  assertions TEXT,                -- JSON array of assertion results
  error TEXT
);

CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_file TEXT NOT NULL,
  test_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  output TEXT NOT NULL,
  embedding BLOB,                 -- for similarity comparison
  created_at INTEGER NOT NULL,
  UNIQUE(test_file, test_name, provider)
);

CREATE INDEX idx_results_run ON results(run_id);
CREATE INDEX idx_results_test ON results(test_file, test_name);
```

Database location: `.promptforge/db.sqlite` in project root (gitignored by default).

---

## Dashboard Features

Served via `promptforge ui`. CLI spawns a Hono server on port 3939 (configurable), opens browser.

**Pages:**

1. **Runs** (`/`) — chronological list of all test runs. Filters by date, provider, pass/fail. Click into any run for drilldown.

2. **Run Detail** (`/runs/:id`) — all test results for a run. Per-test expandable cards showing input vars, output, assertion results, cost, latency.

3. **Compare** (`/compare?a=runA&b=runB`) — side-by-side diff view. For each test+provider pair, show:
   - Output A vs Output B (rendered with react-diff-viewer)
   - Assertion pass/fail delta
   - Cost delta
   - Latency delta

4. **Trends** (`/trends`) — charts over time: cost per run, pass rate per test, latency p50/p95.

5. **Test Explorer** (`/tests`) — all tests across all files, with pass history sparkline per provider.

**Aesthetic:**
- Dark mode by default
- Monospace (JetBrains Mono) for code and outputs
- Font: Inter for UI, Space Grotesk for display
- Accent: electric blue (#3B82F6) with orange highlights (#F97316) for fail states
- Inspired by Linear, Vercel's dashboard, and Jest's UI

---

## 7-Day Build Plan

### Day 1 (Mon) — Foundation
- Initialize project with tsup + TypeScript
- CLI scaffold with Commander (`init`, `run`, `list`, `--help`)
- Config loader: YAML parsing with Zod validation
- Test file auto-discovery (glob `**/*.test.yaml`)
- Basic test runner (sequential first, then parallel)
- Three simplest assertions: `contains`, `notContains`, `regex`
- Basic CLI reporter (chalk-colored pass/fail list)
- **Deliverable:** `promptforge run` executes tests, prints pass/fail

### Day 2 (Tue) — Provider Layer
- Provider interface + registry
- Anthropic, OpenAI, Gemini, Ollama implementations
- Variable templating (`{{var}}` Mustache-style)
- Cost tracking via pricing tables
- Latency measurement
- Retry logic with exponential backoff
- Multi-provider test execution (same test runs against N providers)
- **Deliverable:** Tests run against all 4 providers with cost/latency tracking

### Day 3 (Wed) — Advanced Assertions
- `jsonSchema` (Ajv integration)
- `semanticSimilarity` (transformers.js + all-MiniLM-L6-v2, lazy-loaded)
- `llmJudge` (structured meta-prompting, configurable judge model)
- `snapshot` testing (record-on-first-run, detect drift via embedding similarity)
- `cost` + `latency` budget assertions
- `custom` assertion support (for TS config only)
- **Deliverable:** All 8 assertion types working end-to-end

### Day 4 (Thu) — Storage + History
- SQLite setup via better-sqlite3
- Schema migrations
- Record every run + result + snapshot
- TS config loader (via tsx runtime)
- `promptforge compare <a> <b>` CLI command with terminal diff
- Regression detection ("test X passed last run, fails now")
- **Deliverable:** Historical runs queryable, diff-able

### Day 5 (Fri) — Dashboard
- Vite + React + Tailwind scaffold in `src/dashboard/`
- Hono API server reading from SQLite
- `promptforge ui` command: spawns server, opens browser
- Pages: Runs list, Run detail, Compare, Trends
- Diff viewer component with syntax highlighting
- Recharts integration for trend charts
- **Deliverable:** Dashboard renders historical data, diffs work

### Day 6 (Sat) — Polish
- Beautiful CLI output (Jest-style): spinner per test, grouped failures at bottom, summary box
- Watch mode (`promptforge watch`) — chokidar-based file watching
- `promptforge init` interactive scaffolder (prompt questions, generate example files)
- JUnit XML reporter for CI integration
- Config file support (`promptforge.config.ts`) for global defaults
- Helpful error messages (yaml syntax errors, missing API keys, etc.)
- **Deliverable:** Product-quality DX

### Day 7 (Sun) — Ship
- README with badges, animated CLI gif, architecture diagram
- Landing page (`docs/` folder or GitHub Pages)
- 2-minute demo video (record: setup → write test → run → see dashboard)
- 3 example projects in `examples/` folder with real prompts
- Publish to npm (`npm publish --access public`)
- GitHub release + tweet + HN/Product Hunt draft
- **Deliverable:** Public launch

---

## Getting Started (User-facing)

```bash
npm install -g promptforge

cd my-llm-project
promptforge init

# Set up API keys
export ANTHROPIC_API_KEY=sk-...
export OPENAI_API_KEY=sk-...

# Write a test (or use scaffolded example)
cat prompts/hello.test.yaml

# Run it
promptforge run

# See results in dashboard
promptforge ui
```

---

## Sample Prompt + Test (to ship in `examples/`)

**`examples/customer-support/triage.md`**
```markdown
You are a customer support triage agent. Classify the incoming message
and respond in JSON.

User message: {{message}}

Respond with valid JSON matching:
{
  "category": "billing" | "technical" | "account" | "other",
  "urgency": "low" | "medium" | "high",
  "suggested_reply": string
}
```

**`examples/customer-support/triage.test.yaml`**
```yaml
prompt: ./triage.md
providers:
  - anthropic/claude-sonnet-4-6
  - openai/gpt-4o-mini

tests:
  - name: billing complaint
    vars:
      message: "I was charged twice this month"
    assert:
      - type: jsonSchema
        schema:
          type: object
          required: [category, urgency, suggested_reply]
      - type: contains
        value: billing
      - type: llmJudge
        criteria: "suggested_reply is empathetic and actionable"

  - name: urgent technical issue
    vars:
      message: "Production is down, losing revenue every minute"
    assert:
      - type: contains
        value: high
      - type: latency
        maxMs: 3000
```

---

## Design Principles

1. **Zero config to start, infinitely configurable.** `promptforge init` → working tests in 30 seconds. Config file optional.

2. **CLI output is a feature.** Not an afterthought. Spend real time making it beautiful. Study Jest, Vitest, Playwright output.

3. **Local-first.** Ollama as a first-class citizen means developers can iterate without burning API credits.

4. **Provider agnostic.** Anthropic ≠ special. OpenAI ≠ special. Add a provider in 50 lines.

5. **Fail loudly, fail clearly.** When an assertion fails, show: what was expected, what was received, where in the file, and why.

6. **The dashboard is the killer feature.** 90% of competitors have ugly or no UI. We win here.

---

## License

MIT
