# Twitter / X launch thread

6 tweets. Hook → problem → solution → demo → features → call-to-action.
First tweet carries the demo GIF so it renders in the timeline preview.

---

## Tweet 1/6 — hook + GIF

> I shipped a prompt change last month that silently broke our support
> classifier for three days before anyone noticed.
>
> I built a thing so it never happens again.
>
> PromptForge — Jest for prompts.
>
> [demo GIF attached]

**Media**: `docs/images/demo.gif` (native upload — do NOT link to the
GitHub raw URL, Twitter's GIF rendering is better than its MP4
rendering of GitHub's preview).

---

## Tweet 2/6 — the problem

> LLM regressions are the worst kind: no stack trace, no test failure,
> no alert. A model update re-ranks a category, a prompt tweak drops
> empathy, a JSON field quietly changes type — and downstream users
> just get subtly worse answers.
>
> You can't CI what you can't assert.

---

## Tweet 3/6 — what PromptForge does

> PromptForge is a CLI + local dashboard that lets you assert your
> prompts work, the way you assert your code works.
>
> Write tests in YAML:
>
> [screenshot of a test file — 6 assertion types visible]
>
> Run them. Every run = one SQLite row. Compare any two runs. Catch
> regressions automatically.

**Media**: screenshot of `examples/customer-support/triage.test.yaml`
rendered in a dark-theme editor.

---

## Tweet 4/6 — multi-provider

> Same test file runs against Anthropic, OpenAI, Gemini, and Ollama.
>
> Ollama is first-class — iterate for free locally, hit paid models
> when you need them. Cost + latency are tracked per provider with
> budget assertions:
>
>   - type: cost
>     max: 0.002
>   - type: latency
>     maxMs: 3000

---

## Tweet 5/6 — local-first

> Everything runs on your machine. Dashboard binds to 127.0.0.1. No
> SaaS, no telemetry, no signup. Your prompts stay yours.
>
> The regression-detection engine is just SQLite + a reusable diff
> function. Compare "previous" to "latest" and see what broke:
>
> [screenshot of compare view]

**Media**: `docs/images/dashboard-compare.png`.

---

## Tweet 6/6 — CTA

> MIT licensed, v0.1.0, solo-built in one week.
>
>   npm install -g promptforge
>   promptforge init
>   promptforge run
>
> GitHub: github.com/ManeeshJupalle/PromptForge
>
> Feedback especially welcome on the assertion types — what am I
> missing?

---

## Timing

- Post Tuesday or Wednesday, 8-10 AM Pacific.
- Don't schedule with Hootsuite / Buffer — embedded GIFs render worse
  than native uploads. Post manually.
- Engage with every reply for 2 hours. Then check in every 30 min for
  the next 6 hours.

## Copy-to-paste plain text

Tweet 1:
```
I shipped a prompt change last month that silently broke our support classifier for three days before anyone noticed.

I built a thing so it never happens again.

PromptForge — Jest for prompts.
```

Tweet 2 (reply to 1):
```
LLM regressions are the worst kind: no stack trace, no test failure, no alert. A model update re-ranks a category, a prompt tweak drops empathy, a JSON field quietly changes type — and downstream users just get subtly worse answers.

You can't CI what you can't assert.
```

Tweet 3 (reply to 2):
```
PromptForge is a CLI + local dashboard that lets you assert your prompts work, the way you assert your code works.

Write tests in YAML. Run them. Every run = one SQLite row. Compare any two runs. Catch regressions automatically.
```

Tweet 4 (reply to 3):
```
Same test file runs against Anthropic, OpenAI, Gemini, and Ollama.

Ollama is first-class — iterate for free locally, hit paid models only when you need them. Cost + latency tracked per provider with budget assertions.
```

Tweet 5 (reply to 4):
```
Everything runs on your machine. Dashboard binds to 127.0.0.1. No SaaS, no telemetry, no signup. Your prompts stay yours.

The regression engine is just SQLite + a diff function. Compare "previous" to "latest" and see what broke.
```

Tweet 6 (reply to 5):
```
MIT, v0.1.0, solo-built in one week.

  npm install -g promptforge
  promptforge init
  promptforge run

GitHub: github.com/ManeeshJupalle/PromptForge

Feedback especially welcome on the assertion types — what am I missing?
```
