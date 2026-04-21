# Code-review assistant

A reviewer prompt that produces free-form prose. Free-form output is
exactly where prompt regressions hide — tests that just check length or
a keyword will pass even as the review quality silently degrades.

## Why `semanticSimilarity` and not `contains`

If we asserted `contains: "sql injection"`, a paraphrase like
"this is vulnerable to parameter injection attacks" would pass with a
different semantic meaning. Conversely, `contains: "vulnerable"` would
fail on a perfectly good review that phrased the fix differently.

`semanticSimilarity` compares the model's output against a reference
review via cosine similarity on local embeddings. Threshold 0.65 is
permissive enough to accept reasonable paraphrases while catching drift
to a meaningfully different answer.

## Assertions used

| Assertion | Why |
|-----------|-----|
| `semanticSimilarity` | Tolerate paraphrase while catching quality regressions. |
| `contains` | Anchor on specific keywords where they should appear. |
| `notContains` | Guard against the model flagging clean code as vulnerable. |
| `cost` / `latency` | A more verbose prompt is usually a worse prompt. Budget both. |

## Running

```bash
promptforge run examples/code-review/
```

The semantic-similarity assertion triggers a one-time download of the
`Xenova/all-MiniLM-L6-v2` model (~25 MB) on first use. Subsequent runs
hit the local cache.
