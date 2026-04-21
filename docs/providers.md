# Providers

PromptForge ships with five providers. Each is dynamic-imported — you
only pay the SDK load cost for providers you actually use.

## Model naming

Every provider uses `<vendor>/<model>`.

```
anthropic/claude-sonnet-4-6
openai/gpt-4o-mini
gemini/gemini-1.5-flash
ollama/llama3.2
mock
```

Unknown vendors fail fast with a clear message listing the supported set.

## Configuring each provider

### Anthropic Claude

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Get a key: https://console.anthropic.com/settings/keys

Models with priced entries: `claude-opus-4-7`, `claude-sonnet-4-6`,
`claude-haiku-4-5`. Any other Claude model also works — cost reporting
just returns 0 for unknown models.

### OpenAI

```bash
export OPENAI_API_KEY=sk-...
```

Get a key: https://platform.openai.com/api-keys

Priced: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`.

### Google Gemini

```bash
export GOOGLE_API_KEY=...     # or GEMINI_API_KEY; either works
```

Get a key: https://aistudio.google.com/app/apikey

Priced: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`.

### Ollama

No API key. Requires a local Ollama daemon.

```bash
ollama serve &
ollama pull llama3.2          # or phi3, mistral, etc.
```

Point PromptForge at a non-default host:

```bash
export OLLAMA_HOST=http://192.168.1.10:11434
```

Every `ollama/*` model is free in the cost table.

### Mock

No configuration. Returns the test's `mockOutput` field, or an empty
string if none is set. First-class — deterministic tests run without
burning credits.

## Cost tracking

The pricing table lives at
[`src/core/providers/pricing.ts`](../src/core/providers/pricing.ts).
Prices are in USD per 1 million tokens.

```typescript
{
  'anthropic/claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  // ...
}
```

Update manually when providers change pricing — pricing pages are linked
in the file's header comment. A model not in the table reports cost = 0
rather than throwing, so unlisted models work; you just don't get
accurate cost metrics for them.

## Retry logic

Every provider call runs through a shared retry wrapper:

- 3 attempts
- Exponential backoff (500ms base, cap 8s) + jitter
- Retries only on: HTTP 429, HTTP 5xx, known transient codes
  (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`, `UND_ERR_SOCKET`,
  `ECONNREFUSED`)
- **Not** retried on 4xx client errors — bad prompts fail fast.

## Adding a new provider

Three files:

1. `src/core/providers/<vendor>.ts` — factory exporting `create<Vendor>Provider(name, model)`.
   Follow the pattern in `anthropic.ts`: lazy-init client, dynamic SDK
   import, wrap the SDK call in `withRetry`, translate to `CompletionResult`.
2. `src/core/providers/index.ts` — add a `case '<vendor>':` branch.
3. `src/core/providers/pricing.ts` — add entries for priced models.

Every provider implements the same interface:

```typescript
export interface Provider {
  name: string;
  complete(params: {
    prompt: string;
    vars: Record<string, unknown>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<CompletionResult>;
}

export interface CompletionResult {
  output: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
  latencyMs: number;
  raw?: unknown;
}
```

The provider is responsible for calling `renderTemplate(prompt, vars)`
before sending to its SDK.
