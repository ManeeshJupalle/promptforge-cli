# How PromptForge compares

Honest framing against the adjacent tools. We're a new, scrappy v0.1.0
— not a Series B competitor. If one of these is a better fit for your
team, go use it.

## vs. Braintrust

Braintrust is a hosted evaluation platform with dataset management, a
polished web UI, team collaboration, and judge models as a service.

- **PromptForge does better**: local-first (no data leaves your
  machine), self-hostable dashboard, MIT license, CLI-as-the-primary-UI,
  zero lock-in.
- **Braintrust does better**: team features, large-dataset workflows,
  hosted judges, polished comparison UI, enterprise support.

If you're sharing datasets across a team and need SOC2, Braintrust.
If you're iterating on prompts on your laptop and want your test
outputs to stay there, PromptForge.

## vs. PromptLayer

PromptLayer focuses on logging and prompt versioning in production —
capturing every LLM call your app makes with a one-line SDK.

- **PromptForge does better**: assertion-based testing, CI integration,
  regression detection, cost budgets, snapshot drift detection.
- **PromptLayer does better**: production observability, prompt
  version management, non-engineer-friendly UI, dataset export.

PromptLayer is for observing what your app does. PromptForge is for
asserting what your app *should* do.

## vs. LangSmith

LangSmith is part of LangChain's ecosystem. Tracing + evaluations +
a UI for non-engineers.

- **PromptForge does better**: runs without LangChain, no hosted
  dependency, local-first, CLI-first DX, MIT license.
- **LangSmith does better**: trace visualization for complex chains,
  deep LangChain integration, team collaboration.

If you're on LangChain, use LangSmith. If you're calling provider SDKs
directly, PromptForge gets out of your way.

## vs. Langfuse

Langfuse is open-source observability for LLM apps — traces, scoring,
dataset management. Self-hostable.

- **PromptForge does better**: CLI-driven testing (Langfuse is
  dashboard-first), watch mode for iteration, JUnit reporter for CI.
- **Langfuse does better**: production tracing, multi-step call
  graphs, user-scored feedback capture, a more mature dashboard.

Langfuse is closer in spirit (open-source, self-hostable) — they
handle the "what did the app do in production" question, PromptForge
handles the "does the prompt still do what I wrote it to do" question.
Using both is reasonable.

## vs. Writing your own Jest tests

A lot of teams start here. `describe('my prompt', () => { test('...', ...) })`
with a manual fetch to OpenAI. It works fine — for five tests.

- **PromptForge does better**: built-in cost tracking, semantic
  similarity without writing your own embedding pipeline, run history
  in SQLite, compare command, dashboard, snapshot drift detection,
  cross-provider matrix.
- **Jest does better**: it's already in your project.

The breakeven is around "I have more than a handful of prompt tests
and I want to see how they trend over time" — that's when the built-in
history + dashboard start paying for themselves.
