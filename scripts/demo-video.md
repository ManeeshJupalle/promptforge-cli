# 2-minute demo video script

Record at 1080p with OBS (free) or QuickTime. Upload as **unlisted** to
YouTube. Embed in README and `docs/index.html`. Add auto-captions, then
review and correct them — auto-captions mangle "promptforge" and
"assertion" every time.

Total length: **under 120 seconds**. Scripted, not ad-libbed.

---

## Scene 1 — The 10-second hook (0:00–0:10)

**On screen**: terminal, full-screen, dark theme.

**Voiceover**:
> "This is PromptForge. It's Jest for prompts — a testing framework
> that catches LLM regressions before they hit production. Let me show
> you in under two minutes."

**Actions** (pre-clean the state):
```bash
rm -rf .promptforge prompts promptforge.config.ts
```

---

## Scene 2 — Init and first run (0:10–0:40)

**Voiceover**:
> "First, scaffold a project."

```bash
promptforge init
```

Accept the defaults. Show the four prompts briefly; don't linger.

**Voiceover** (while the scaffold writes):
> "That gives me a config, a test directory, and a passing example
> that uses a mock provider — so I can verify the wiring without a
> single API key."

```bash
promptforge run
```

Show the clean green pass.

**Voiceover**:
> "Zero keys, green board. Now let's break something on purpose."

---

## Scene 3 — Regression + diagnostic (0:40–1:05)

Open `prompts/hello.test.yaml` in a visible editor. Change
`mockOutput` from the working greeting to a junk string.

```bash
promptforge run
```

Show the FAIL SUMMARY box with expected/received.

**Voiceover**:
> "PromptForge boxes the failure with the exact diagnostic — expected,
> received, assertion type. And because every run is recorded to a
> local SQLite database, it also flags this as a regression against
> the previous run."

```bash
promptforge compare previous latest
```

Show the unified diff + cost delta.

---

## Scene 4 — Watch mode (1:05–1:25)

**Voiceover**:
> "For iteration, there's watch mode."

```bash
promptforge watch
```

Fix the `mockOutput` in the editor, save. Watch the screen clear and
re-run automatically, now green.

**Voiceover**:
> "200ms debounce. Interactive keys: `a` runs all, `f` runs just the
> failures, `q` quits. It never pollutes the run history table unless
> you pass `--record`."

Press `q` to quit.

---

## Scene 5 — Dashboard (1:25–1:50)

```bash
promptforge ui
```

Browser opens to `http://127.0.0.1:3939`.

**Show, in order**:
1. Runs list — scroll a bit.
2. Click a run — show the expanded assertion cards.
3. Click "compare to previous" — show the diff view with the regression.
4. Click "Trends" — show the cost line + pass/fail stacked bar.

**Voiceover** (over the 20 seconds of clicking):
> "The dashboard reads the same SQLite file. Runs list, side-by-side
> compare with output diffs, cost and latency deltas, trend charts.
> Local only — it binds to 127.0.0.1 and no third-party sees your
> prompts."

---

## Scene 6 — Close (1:50–2:00)

Return to terminal.

**Voiceover**:
> "One command to install, zero to start. MIT licensed, open source,
> built in one week. Link below — give it a star if it's useful."

```bash
npm install -g promptforge
```

**On screen**: final frame with the install command + a "GitHub:
github.com/ManeeshJupalle/PromptForge" overlay.

---

## Captions checklist

- [ ] Upload captures, wait for auto-captions.
- [ ] Open YouTube Studio → Subtitles → edit. Fix "promptforge",
      "assertion", "snapshot", "provider", "regression" — every time.
- [ ] Download the corrected SRT and commit to `docs/captions.srt`.
- [ ] Add to the README with `<details><summary>Transcript</summary>`.

## Production notes

- **Terminal font**: JetBrains Mono, 16pt. Matches the rest of the
  project's aesthetic.
- **Color scheme**: dark (Builtin Dark or similar). Saves viewer's eyes.
- **No stock music.** Voice only. Background music is a tell that
  you're overselling.
- **Pace**: faster than feels comfortable. Viewers scrub.
- **Thumbnail**: a frozen frame of the FAIL SUMMARY box. Failures draw
  clicks; pass screenshots don't.
