# Show HN post

## Title options (pick one)

1. `Show HN: PromptForge – Jest for prompts, local-first, multi-provider`
2. `Show HN: PromptForge – A testing framework for LLM prompts with a self-hostable dashboard`
3. `Show HN: PromptForge – Catch prompt regressions before they hit production`

**Recommendation**: #1. "Jest for prompts" is instantly legible to HN readers; the two qualifiers clarify what it *isn't* (cloud, single-provider).

## URL

`https://github.com/ManeeshJupalle/PromptForge`

## First comment (post this yourself, within 30 seconds of submission)

```
Hey HN — this is something I built in a week and just published.

The problem it scratches: I kept shipping prompt changes that silently
degraded answers. A cost optimization strips the apology language from
a refund reply; a JSON shape drifts from `email: null` to `email: "N/A"`;
a model update re-classifies a billing complaint as "other." Nothing
obviously broken, just quietly worse.

PromptForge is a CLI that treats these as regressions and fails the
build. You write assertions in YAML (or TypeScript if you want
closures):

  - type: jsonSchema
    schema: { required: [category, urgency] }
  - type: semanticSimilarity
    expected: "I'll escalate for refund"
    threshold: 0.75
  - type: llmJudge
    criteria: "Response is empathetic and offers next steps"

Ten assertion types including a local-embeddings similarity check
(Xenova/all-MiniLM-L6-v2) and snapshot-drift detection. Runs against
Anthropic, OpenAI, Gemini, and Ollama from the same file. Every run
goes into a local SQLite database; there's a Hono+React dashboard
(bound to 127.0.0.1 — no third-party) with a compare view for diffing
runs.

Things it deliberately does *not* do: hosted backend, team features,
agent-trajectory evals, dataset management. Those are fine tools —
Braintrust, LangSmith, Langfuse, PromptLayer — and I've written an
honest comparison in the docs. PromptForge is the local-first,
CLI-first, one-person-on-a-laptop option.

It's MIT, v0.1.0, installable via `npm i -g promptforge`. I'd love
feedback on anything — the reporter aesthetics, what assertions are
missing, where the DX breaks down.

Happy to answer questions.
```

## Notes on HN timing

- Best posting windows: Tuesday–Thursday, 08:30–10:00 AM Pacific.
- First hour matters most. Be available to answer comments.
- Don't upvote your own submission. Don't ask friends to upvote in
  the first hour — HN's algorithm penalizes detected vote rings harder
  than you'd think.
- If the post doesn't get traction, don't delete-and-resubmit. Let it
  die and try again in 2–3 weeks with new framing or new material
  (v0.2 launch, a case study, etc.).
