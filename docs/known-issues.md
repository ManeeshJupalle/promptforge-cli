# Known issues

A running list of caveats, quirks, and environmental surprises.

## Transitive vulnerability in `protobufjs`

**Reached via**: `@xenova/transformers` → `onnxruntime-web` → `onnx-proto` → `protobufjs <7.5.5`.

**Advisory**: [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg)
— arbitrary code execution when parsing untrusted protobuf payloads.

**Mitigation (applied)**: PromptForge pins `protobufjs` to `^7.5.5`
via the `overrides` field in `package.json`. After `npm install`,
`npm audit --omit=dev` reports **zero production vulnerabilities**.

**Threat-model note**: even without the override, the exploit vector
requires loading a malicious protobuf. In PromptForge's use path,
protobufs are only used internally by ONNX Runtime to deserialize the
pinned `Xenova/all-MiniLM-L6-v2` model from HuggingFace's CDN. A user
who replaces the model with an attacker-controlled one would already
have code execution on your machine by virtue of it being your
machine. The override closes the theoretical advisory-match CVE
scanner noise.

## Dev-dependency vulnerabilities

`npm audit` (full) reports 2 moderate vulnerabilities in the Vite /
React toolchain at v0.1.0 publish time. These are dev-only — they
don't ship in the published tarball and don't affect users who install
via `npm install promptforge`. Upstream fixes are pending.

## Node 20 `ExperimentalWarning` from tsx

When you load a `.test.ts` file on Node 20.x, `tsx/esm/api.register()`
emits a one-time warning:

```
ExperimentalWarning: Module.register() is experimental and may change in future versions.
```

Silence it:

```bash
export NODE_OPTIONS="--no-warnings=ExperimentalWarning"
```

Clean on Node 22+.

## Windows programmatic SIGINT

On Windows, `child.kill('SIGINT')` from a parent Node process is
implemented as a forceful termination at the OS level — it bypasses
the child's registered signal handlers. This only matters if you're
driving PromptForge from another Node process and expecting the
graceful-shutdown path to run.

Real-terminal `Ctrl-C` generates `CTRL_C_EVENT` and routes through
Node's SIGINT handler correctly. `promptforge ui` and `promptforge
watch` both clean up (stop the Hono server, close SQLite, restore
`rawMode`) when you press Ctrl-C in a terminal.

## Dashboard: `dev:dashboard` proxy assumes port 3939

`npm run dev:dashboard` proxies `/api/*` to `http://localhost:3939`.
If you started `promptforge ui` on a different port, the Vite dev
server's API calls will 404. Fix: either run `promptforge ui` without
`-p`, or edit `vite.config.ts`'s proxy target.

## First-run model download

The first `semanticSimilarity` or `snapshot` assertion triggers a
one-time download of `Xenova/all-MiniLM-L6-v2` (~25 MB) into
`node_modules/@xenova/transformers/.cache/`. On a fast connection it
completes in a couple of seconds. On a slow or metered connection,
budget a minute. Subsequent runs are cached and fast (~50–200 ms per
embedding).

## `better-sqlite3` on Node 24

`better-sqlite3 < 12.9.0` does not ship prebuilds for Node 24 and
falls back to building from source (needs Python + a C++ toolchain).
PromptForge pins `^12.9.0`, which has Node 20 / 22 / 24 prebuilds.
If you see `node-gyp` errors during `npm install`, either upgrade the
pinned version or install Visual Studio Build Tools (Windows) /
Xcode Command Line Tools (macOS).
