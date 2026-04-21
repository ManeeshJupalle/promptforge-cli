# Product Hunt listing

## Basics

**Name**: PromptForge

**Tagline** (60 char max, hook-driven):
`Jest for prompts — catch LLM regressions before production`

**Category**: Developer Tools → Testing

**Topics** (pick up to 4):
- Artificial Intelligence
- Developer Tools
- Open Source
- Testing

## Description (260 char max)

> Local-first testing framework for LLM prompts. Write assertions,
> run against Anthropic / OpenAI / Gemini / Ollama, get a
> self-hostable dashboard with regression detection, cost tracking,
> and snapshot drift. Zero cloud. MIT. Install in 30 seconds.

## What is it?

PromptForge is the tool I wish existed the last time a silent prompt
change cost my team a Friday. It lets you write tests that assert
your prompts still do what you wrote them to do — shape validation,
semantic similarity, LLM-as-judge scoring, snapshot drift detection,
cost budgets. Every run gets recorded to a local SQLite database, so
you can diff any two runs and see exactly which tests regressed.

The pitch in one line: you know how Jest made it embarrassing to
ship JavaScript without tests? This does that for prompts.

## What makes it different?

- **Local-first**: your prompts, test outputs, and run history never
  leave your machine. No SaaS, no telemetry, no auth to set up.
- **Multi-provider**: one test file runs against Anthropic, OpenAI,
  Gemini, and Ollama. Ollama is a first-class citizen so you can
  iterate for free.
- **Self-hostable dashboard**: Hono + React + SQLite, all local.
  Binds to 127.0.0.1 only.
- **CLI-first DX**: `promptforge run`, `promptforge watch`, `promptforge
  compare`. No web-app to log into, no click-through onboarding.

## Gallery images (in order)

1. **Hero GIF** — `docs/images/demo.gif` (from `vhs scripts/demo.tape`).
   Shows a failing assertion + the diagnostic box.
2. **Terminal screenshot** — the FAIL SUMMARY with boxen. Captures
   the aesthetic.
3. **Dashboard runs view** — `docs/images/dashboard-runs.png`.
4. **Dashboard compare view** — `docs/images/dashboard-compare.png`.
   Shows the diff + regression highlighting.
5. **Dashboard trends view** — `docs/images/dashboard-trends.png`.
   Looks great; shows the charts.

## Makers section

One maker for launch (you). Brief "about" text:

> Solo dev, first open-source launch. Built this in one week to
> scratch my own itch around shipping LLM features. Would love your
> feedback — especially on the assertion types and reporter output.

## Hunter's outreach template (if you're asking someone to hunt it)

Subject: Would you hunt PromptForge on Product Hunt?

Hey [name],

I'm launching an open-source testing framework for LLM prompts next
[day] and I'd be honored if you'd hunt it. It's called PromptForge —
"Jest for prompts," MIT licensed, local-first, runs against
Anthropic/OpenAI/Gemini/Ollama from the same test file, ships with a
self-hostable dashboard.

I've seen you hunt [tool1], [tool2] — PromptForge fits the same
"indie dev tool you'd actually install" energy.

Demo GIF: [link]
README: [link]
Launch date: [date]

No pressure, and happy to answer questions before you decide.

## Launch-day checklist

- [ ] Post at midnight Pacific (12:01 AM PST) — resets daily
      leaderboard.
- [ ] Tweet + LinkedIn post within 15 minutes of the PH listing going
      live, linking to the PH page (not the repo).
- [ ] Reply to every comment on PH within 30 minutes for the first 4
      hours.
- [ ] Don't buy upvotes. Don't ask your Slack community to brigade.
      PH has got better at detecting both.
