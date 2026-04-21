# Structured extraction — resume parser

Extraction is where prompts break most often and most silently. A model
update can start emitting `"email": "N/A"` where it previously emitted
`null`, or flip `years_of_experience` from an integer to a string. A
downstream schema doesn't care what the prompt author intended — it
crashes.

## Why `snapshot` and `jsonSchema` together

- **`jsonSchema`** pins the *shape* — types, required fields,
  unions, enums. Changes to the shape fail loudly.
- **`snapshot`** pins the *wording* — the first passing run becomes the
  golden; subsequent runs compare via cosine similarity against the
  stored embedding. Cosmetic whitespace or field-order changes pass;
  content drift fails. Threshold 0.92 is strict enough to catch
  meaningful regressions while tolerating minor reformat.

If a snapshot failure is *intentional* (you purposely changed the
prompt), accept the new output as golden:

```bash
promptforge snapshot --update --filter "extracts senior"
```

## Assertions used

| Assertion | Why |
|-----------|-----|
| `jsonSchema` | Shape contract: every field typed, no surprise additions. |
| `regex` | Anchor on specific patterns (email presence, null handling). |
| `snapshot` | Catch semantic drift in the exact extracted values. |

## Running

```bash
promptforge run examples/extraction/
```

First run records snapshots under `.promptforge/db.sqlite`. Subsequent
runs compare against them.
