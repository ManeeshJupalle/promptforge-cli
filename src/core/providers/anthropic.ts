import type { CompletionResult, Provider } from '../types/index.js';
import { computeCost } from './pricing.js';
import { renderTemplate } from './template.js';
import { withRetry } from './retry.js';

// Loosely typed to keep the SDK import lazy (dynamic import below avoids
// loading the SDK for mock-only / other-provider-only test runs).
type AnthropicClient = {
  messages: {
    create(params: Record<string, unknown>): Promise<{
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
};

export function createAnthropicProvider(name: string, model: string): Provider {
  let client: AnthropicClient | null = null;

  async function getClient(): Promise<AnthropicClient> {
    if (client) return client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        `${name}: set ANTHROPIC_API_KEY to use this provider — get a key at https://console.anthropic.com/settings/keys`,
      );
    }
    const mod = await import('@anthropic-ai/sdk');
    const Anthropic = mod.default;
    client = new Anthropic({ apiKey }) as unknown as AnthropicClient;
    return client;
  }

  return {
    name,
    async complete({ prompt, vars, maxTokens = 1024, temperature }): Promise<CompletionResult> {
      const rendered = renderTemplate(prompt, vars);
      const anthropic = await getClient();

      const started = Date.now();
      const response = await withRetry(() =>
        anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          ...(temperature !== undefined ? { temperature } : {}),
          messages: [{ role: 'user', content: rendered }],
        }),
      );
      const latencyMs = Date.now() - started;

      const output = (response.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');
      const promptTokens = response.usage?.input_tokens ?? 0;
      const completionTokens = response.usage?.output_tokens ?? 0;

      return {
        output,
        usage: { promptTokens, completionTokens },
        cost: computeCost(name, promptTokens, completionTokens),
        latencyMs,
        raw: response,
      };
    },
  };
}
