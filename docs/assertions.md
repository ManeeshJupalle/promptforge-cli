# Assertions

PromptForge ships ten assertion types. Every assertion returns
`{ passed: boolean, message?: string, details?: Record<string, unknown> }`
at runtime. The `details` shape for each type is documented below — the
dashboard renders these fields in the failure view.

---

## `contains` / `notContains`

Substring match against the model's output.

```yaml
- type: contains
  value: "billing"
  caseSensitive: false   # optional; default false
```

`details` on failure: `{ expected, caseSensitive, received }`.

---

## `regex`

ECMAScript regular expression match.

```yaml
- type: regex
  pattern: "^\\{.*\\}$"
  flags: "s"             # optional; JS regex flags (g, i, m, s, u, y)
```

Use the `flags` field — ECMAScript regex doesn't support inline `(?i)`.

`details` on failure: `{ pattern, flags, received }`.

---

## `jsonSchema`

Validate the output as JSON against a JSON Schema. Uses [Ajv](https://ajv.js.org/)
under the hood. If the output isn't pure JSON, PromptForge tries to extract
the first balanced `{…}` or `[…]` block.

```yaml
- type: jsonSchema
  schema:
    type: object
    required: [category, urgency]
    properties:
      category: { enum: [billing, technical, account, other] }
      urgency: { enum: [low, medium, high] }
    additionalProperties: false
```

`details` on failure: `{ errors: AjvError[], received: any }`.

---

## `semanticSimilarity`

Cosine similarity between the output and a reference string, computed via
local embeddings (`Xenova/all-MiniLM-L6-v2`, ~25 MB, cached after first run).

```yaml
- type: semanticSimilarity
  expected: "Please provide more details about your issue."
  threshold: 0.75        # optional; default 0.75
```

Thresholds by intent:

| Threshold | Interpretation |
|-----------|---------------|
| `0.9+`    | Near-exact paraphrase |
| `0.7–0.9` | Same meaning, different words |
| `0.5–0.7` | Related topic, looser fit |
| `< 0.5`   | Unrelated — threshold too low to be meaningful |

`details` on failure: `{ similarity, threshold, expected, received }`.

---

## `llmJudge`

Have an LLM grade the output against plain-English criteria. Returns a
score 1–5 with a one-sentence reasoning. Fails if `score < threshold`.

```yaml
- type: llmJudge
  criteria: "Response is empathetic and offers next steps"
  judgeModel: anthropic/claude-haiku-4-5   # optional
  threshold: 4                             # optional; default 4
```

If `judgeModel` is omitted, PromptForge picks the cheapest non-`mock`
provider listed in the suite (Ollama ranks above paid providers because
it's free). Mock is never auto-selected — a mock-only suite with
`llmJudge` and no explicit `judgeModel` fails with a clear error telling
you to set `judgeModel` or add a real provider.

The judge call is accounted for per-assertion, not per-run: the run's
overall `providers` list and top-level `total_cost` only reflect the
suite's primary provider completions. A failing `llmJudge` assertion
records the judge's own cost and latency inside its `details` object
(`judgeCost`, `judgeLatencyMs`) so you can see what the grader actually
spent without inflating the test's primary metrics.

`details` on failure: `{ judgeModel, score, reasoning, threshold, judgeCost, judgeLatencyMs }`.

---

## `snapshot`

Record the output on the first run; compare subsequent runs via embedding
similarity. Fails if the output drifts below the threshold.

```yaml
- type: snapshot
  similarity: 0.9        # optional; default 0.9
```

Snapshots persist in `.promptforge/db.sqlite` (SQLite `snapshots` table).

Update a snapshot after an intentional change:

```bash
promptforge snapshot --update --filter "some test name"
```

Clear one:

```bash
promptforge snapshot --clear "some pattern"
```

`details` on failure: `{ similarity, threshold, stored, received }`.

---

## `cost`

USD budget guardrail. Reads directly from the provider's reported cost
(computed from the pricing table and the response's token usage).

```yaml
- type: cost
  max: 0.002             # dollars
```

`details` on failure: `{ cost, max }`.

---

## `latency`

Latency budget in milliseconds. Reads the provider's measured end-to-end
time (including retries).

```yaml
- type: latency
  maxMs: 3000
```

`details` on failure: `{ latencyMs, maxMs }`.

---

## `custom`

Function-valued assertion. Only works in `.test.ts` files — YAML can't
serialize functions.

```typescript
import { defineTestSuite } from 'promptforge';

export default defineTestSuite({
  prompt: './triage.md',
  providers: ['mock'],
  tests: [
    {
      name: 'output is valid JSON with exactly the expected keys',
      vars: { message: 'hi' },
      mockOutput: '{"category":"other","urgency":"low"}',
      assert: [
        {
          type: 'custom',
          fn: async (output, ctx) => {
            const parsed = JSON.parse(output);
            const expectedKeys = ['category', 'urgency'];
            return {
              passed: expectedKeys.every((k) => k in parsed),
              message: `missing keys: ${expectedKeys.filter((k) => !(k in parsed)).join(', ')}`,
            };
          },
        },
      ],
    },
  ],
});
```

The function may return `boolean`, `{ passed, message?, details? }`, or a
`Promise` of either.

---

## Adding a new assertion type

Every assertion type takes the same shape: an async function that reads
an `AssertionContext` and returns an `AssertionResult`. Three files to
touch:

1. `src/core/assertions/<yourType>.ts` — the executor.
2. `src/core/assertions/index.ts` — one case in the dispatcher switch.
3. `src/dashboard/components/renderers/<YourType>.tsx` — the dashboard
   rendering (unknown types fall back to JSON, so this is optional but
   nice-to-have).

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the PR checklist.
