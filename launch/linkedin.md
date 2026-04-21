# LinkedIn launch post

Slower pacing than Twitter, longer than a tweet, professionally
framed. Target: technical hiring managers, staff+ engineers, CTOs
thinking about LLM reliability.

---

## Full post

> Shipping LLM features without tests feels like shipping JavaScript
> without tests felt in 2011 — ubiquitous, accepted, and quietly costly.
>
> A silent prompt regression that drops classifier accuracy 8% doesn't
> throw a stack trace. A model update that flips a JSON field from
> `null` to `"N/A"` breaks downstream consumers with no obvious
> culprit. An empathy-tuned refund reply gets cost-optimized into a
> one-liner, and support tickets quietly climb.
>
> Over the last week I built PromptForge — an open-source testing
> framework designed to catch these regressions the way Jest catches
> JavaScript ones.
>
> → Write assertions in YAML (or TypeScript, with closures and fixtures)
> → Run against Anthropic, OpenAI, Gemini, and Ollama from the same
>    test file
> → Local-first: SQLite-backed run history, a self-hostable web
>    dashboard bound to 127.0.0.1, zero third-party in the loop
> → Ten assertion types including local-embedding semantic similarity,
>    snapshot drift detection, and LLM-as-judge scoring
> → First-class CI integration via JUnit + JSON reporters
>
> It's v0.1.0, MIT-licensed, installable with `npm i -g promptforge`.
>
> I'd especially love feedback from teams already shipping LLM
> features in production. What regression patterns am I missing?
> What's the one assertion type you wish existed?
>
> Repo: github.com/ManeeshJupalle/PromptForge
> Docs: <landing page URL>
>
> #AI #LLM #OpenSource #DeveloperTools #Testing

---

## Notes

- LinkedIn's algorithm rewards dwell time. Longer posts outperform
  shorter ones if the hook holds. Don't truncate.
- Add the demo GIF as a native upload, not a YouTube link. LinkedIn
  penalizes external video links in the feed.
- Reply to every comment within 2 hours — LinkedIn's algorithm uses
  comment velocity as a signal for the first 90 minutes.
- Don't post on a weekend. Tuesday 9-11 AM or Wednesday 11 AM-1 PM in
  your primary audience's timezone.
- **Before posting**: update your LinkedIn headline to include
  "Built PromptForge (MIT, open source)" — visitors from the post
  check the headline, and a working link back closes the loop.

## If anyone asks about hiring

Mostly you'll get recruiter DMs. Honest framing is better than fake
humility:

> Thanks! I'm not actively looking, but always happy to chat about
> interesting problems / teams. What's the team?

Don't commit to calls. Don't share a resume. Let the project speak.

## What to do with the inevitable "could you add feature X?" comments

Two buckets:
1. **On the roadmap**: reply, link to ROADMAP.md, invite them to the
   GitHub issue.
2. **Not on the roadmap**: reply honestly with *why* it's not — scope,
   local-first commitment, etc. Disagreement in public is more
   credible than corporate evasion.
