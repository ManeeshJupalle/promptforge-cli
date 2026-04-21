# Test files

PromptForge discovers two formats: `*.test.yaml` and `*.test.ts`.

- **YAML** for static tests — the default, read-and-write simple.
- **TypeScript** for dynamic tests — fixtures, closures, computed cases.

Both load into the same runtime `TestSuite` shape. You can mix them in
the same project.

---

## YAML

```yaml
# prompts/triage.test.yaml
prompt: ./triage.md      # relative to this YAML file
providers:
  - anthropic/claude-sonnet-4-6
  - openai/gpt-4o-mini

tests:
  - name: classifies billing complaint
    vars:
      message: "I was charged twice"
    assert:
      - type: contains
        value: "billing"
      - type: jsonSchema
        schema:
          type: object
          required: [category, urgency]
```

Top-level fields:

| Field | Required | Notes |
|-------|----------|-------|
| `prompt` | no | Relative path to a `.md` file. Optional if your test only uses mock outputs. |
| `providers` | no | List of `<vendor>/<model>` IDs. Falls back to `promptforge.config.ts` defaults, then `['mock']`. |
| `tests` | yes | At least one. |

Per-test fields:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Unique within the file. |
| `vars` | no | Object interpolated into `{{placeholders}}` in the prompt. |
| `assert` | no | List of assertions. Empty means the test passes if the call succeeds. |
| `mockOutput` | no | Used only by the `mock` provider — lets you exercise the assertion pipeline deterministically. |

---

## TypeScript

```typescript
// prompts/triage.test.ts
import { defineTestSuite } from 'promptforge';
import { loadFixtures } from './fixtures.js';

export default defineTestSuite({
  prompt: './triage.md',
  providers: ['anthropic/claude-sonnet-4-6'],

  tests: loadFixtures().map((fixture) => ({
    name: `classifies ${fixture.category}`,
    vars: { message: fixture.message },
    assert: [
      { type: 'contains', value: fixture.expectedCategory },
      {
        type: 'custom',
        fn: async (output) => ({
          passed: output.length > 20,
          message: 'output too short',
        }),
      },
    ],
  })),
});
```

`defineTestSuite` is an identity function — it exists purely for
TypeScript DX (autocomplete on the top-level shape). You can also
`export default { ... }` without importing anything.

Function-valued `fn` assertions only work in `.test.ts` files because
YAML can't serialize closures.

> **ESM requirement.** `.test.ts` files are imported through Node's
> ESM resolver (via `tsx`). Your project's `package.json` must declare
> `"type": "module"`, otherwise the loader fails with `Cannot require()
> ES Module ... in a cycle`. The same constraint applies to
> `promptforge.config.ts`.

---

## Variable templating

Prompts use Mustache-style `{{variable}}` interpolation. Dot paths work.

```markdown
Hello {{user.name}}, your last order was {{last_order.id}}.
```

```yaml
vars:
  user: { name: "Alice" }
  last_order: { id: "ord_abc123" }
```

Unknown keys render as empty string (Mustache default). Object values
render via `JSON.stringify` so `{{user}}` inside a prompt doesn't
become the literal `[object Object]`.

---

## Multi-provider syntax

Declaring multiple providers runs every test against each one:

```yaml
providers:
  - anthropic/claude-sonnet-4-6
  - openai/gpt-4o-mini
  - ollama/llama3.2
```

Each (test × provider) pair becomes an independent row in the runs
table. Compare results in the dashboard's run-detail view.

Override for a single run:

```bash
promptforge run --provider anthropic
```

Substring match — `--provider anthropic` matches every
`anthropic/*` model.

---

## Project-level config

`promptforge.config.ts` at your project root provides defaults:

```typescript
import { defineConfig } from 'promptforge';

export default defineConfig({
  testDir: 'prompts',
  providers: {
    defaultModels: ['anthropic/claude-haiku-4-5', 'mock'],
  },
  snapshotThreshold: 0.9,
});
```

Precedence: per-suite > project > hardcoded defaults. Suites that don't
set `providers` inherit `defaultModels`. If `testDir` is set, `promptforge
run` (with no path args) discovers tests inside that directory only —
explicit path arguments on the command line still take precedence.

A malformed `promptforge.config.ts` is fatal: `promptforge run` and
`promptforge list` exit with a non-zero status and print the Zod
validation errors rather than silently continuing with defaults.
