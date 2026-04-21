# Customer support triage

A classifier prompt that turns unstructured user messages into structured
support tickets. This is one of the most common real-world LLM shipping
patterns and it has three failure modes PromptForge catches:

1. **Schema drift.** A model update silently renames a field or adds
   `suggested_reply` as a nested object instead of a string. Caught by
   `jsonSchema` — the test fails immediately on the first run after the
   change lands.
2. **Classification regressions.** A prompt tweak optimizes for one
   category and drops accuracy on another. Caught by the per-category
   `contains` assertions plus regression detection against the previous run.
3. **Empathy decay.** A cost-optimization prompt change strips the
   apology language from refund replies. Caught by `semanticSimilarity`
   against a reference reply.

## Assertions used

| Assertion | Why |
|-----------|-----|
| `jsonSchema` | Shape contract: category enum, urgency enum, string reply. |
| `contains` | Quick sanity on classification output. |
| `semanticSimilarity` | The empathy check — paraphrased replies still pass. |
| `cost` | Budget guardrail; a new prompt that doubles tokens fails CI. |
| `latency` | User-facing SLA; a 5s reply is too slow. |

## Running

```bash
promptforge run examples/customer-support/
```

To run against a real model, edit `providers:` in `triage.test.yaml` to
one of `anthropic/claude-sonnet-4-6`, `openai/gpt-4o-mini`,
`ollama/llama3.2`, etc., and remove the `mockOutput` lines from each test.
