import type { CompletionResult, Provider } from '../types/index.js';
import { computeCost } from './pricing.js';
import { renderTemplate } from './template.js';
import { withRetry } from './retry.js';

type OpenAIClient = {
  chat: {
    completions: {
      create(params: Record<string, unknown>): Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      }>;
    };
  };
};

export function createOpenAIProvider(name: string, model: string): Provider {
  let client: OpenAIClient | null = null;

  async function getClient(): Promise<OpenAIClient> {
    if (client) return client;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        `${name}: set OPENAI_API_KEY to use this provider — get a key at https://platform.openai.com/api-keys`,
      );
    }
    const mod = await import('openai');
    const OpenAI = mod.default;
    client = new OpenAI({ apiKey }) as unknown as OpenAIClient;
    return client;
  }

  return {
    name,
    async complete({ prompt, vars, maxTokens, temperature }): Promise<CompletionResult> {
      const rendered = renderTemplate(prompt, vars);
      const openai = await getClient();

      const started = Date.now();
      const response = await withRetry(() =>
        openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: rendered }],
          ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
          ...(temperature !== undefined ? { temperature } : {}),
        }),
      );
      const latencyMs = Date.now() - started;

      const output = response.choices?.[0]?.message?.content ?? '';
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;

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
