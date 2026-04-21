# Publish checklist — v0.1.0

Don't copy-paste blind. Each step has a *why* — skip at your own risk.

## Pre-flight (do these **before** touching `npm publish`)

### 1. Replace repository placeholders — **done**

All repo URLs point at `https://github.com/ManeeshJupalle/PromptForge`.
If you ever fork/rename, the sweep is:

```bash
grep -rln "ManeeshJupalle/PromptForge" . --exclude-dir=node_modules --exclude-dir=dist \
  | xargs sed -i 's|ManeeshJupalle/PromptForge|<new-owner>/<new-repo>|g'
```

### 2. Confirm version and author

In `package.json`:
- `version` = `"0.1.0"` ✓
- `author` — set to your real name / email if you want it on npm.
- `license` = `"MIT"` ✓

### 3. Capture artifacts

- [ ] Record the terminal demo: `vhs scripts/demo.tape` → produces
      `docs/images/demo.gif`.
- [ ] Take the four dashboard screenshots per `scripts/capture-screenshots.md`
      → `docs/images/dashboard-*.png`.
- [ ] Record the 2-minute demo video per `scripts/demo-video.md`, upload
      to YouTube as **unlisted**, grab the embed URL for README + landing.

Without these, the README renders with broken images on npm's package
page — first impression blown.

### 4. Build, type-check, audit

```bash
npm run typecheck          # must be clean
npm run build              # produces dist/cli.js, dist/index.js, dist/dashboard/
npm audit --omit=dev       # should report 0 production vulnerabilities
```

### 5. Inspect the tarball manifest

```bash
npm pack --dry-run 2>&1 | grep -E 'dist/|bin/|README|LICENSE|CHANGELOG'
```

Critical: `dist/dashboard/assets/` files must appear. If they don't,
add `"dist/**"` to `package.json`'s `files` array.

### 6. Smoke-test the tarball in a clean directory

```bash
npm pack
TMPDIR=$(mktemp -d)
cp promptforge-0.1.0.tgz "$TMPDIR/"
cd "$TMPDIR"
npm init -y
npm install --save-dev ./promptforge-0.1.0.tgz
npx promptforge run --no-record   # should no-op ('No *.test.yaml … found.')
# Generate a scaffold, run it, open the UI briefly.
echo "q" | npx promptforge init   # Or skip if interactive prompts are a pain on CI
npx promptforge run
npx promptforge ui --no-open &
sleep 2
curl -sf http://127.0.0.1:3939/api/health
kill %1
```

If `ui --no-open` starts, responds on `/api/health`, and the run
command produces a passing test — tarball is good to publish.

## Publish

```bash
# Make sure you're logged in to npm with the account that owns (or will own) the name.
npm whoami

# Check the name isn't taken; if it is, decide: promptforge-testing, @<scope>/promptforge, etc.
npm view promptforge 2>&1 | head

# Publish public.
npm publish --access public
```

## Post-publish

```bash
# Tag the commit.
git tag v0.1.0
git push origin main --tags

# Create a GitHub release — paste CHANGELOG.md's [0.1.0] section into the body.
gh release create v0.1.0 \
  --title "v0.1.0 — initial public release" \
  --notes-file scripts/release-notes.md \
  docs/images/demo.gif

# Enable GitHub Pages from /docs on the main branch (Settings → Pages).
# The landing page goes live at https://maneeshjupalle.github.io/PromptForge/.
```

## Launch coordination

Launch posts are drafted under `launch/`:
- `launch/hn.md` — Show HN title + first comment
- `launch/product-hunt.md` — PH tagline + description + gallery list
- `launch/twitter.md` — 6-tweet thread
- `launch/linkedin.md` — professional framing

**Do not post until after the npm publish succeeds** — a dead install
link is the fastest way to lose half the traffic.

## Rollback

If something is broken post-publish:

```bash
# Deprecate rather than unpublish (npm frowns on unpublish for anything older than 72h).
npm deprecate promptforge@0.1.0 "v0.1.0 has a critical bug; please wait for v0.1.1"
# Fix, bump to 0.1.1, republish.
```
