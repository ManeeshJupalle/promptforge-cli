import type { CompletionResult, Provider } from '../types/index.js';
import { computeCost } from './pricing.js';
import { renderTemplate } from './template.js';
import { withRetry } from './retry.js';

type GenerativeModel = {
  generateContent(prompt: string): Promise<{
    response: {
      text(): string;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
  }>;
};

type GeminiClient = {
  getGenerativeModel(params: { model: string; generationConfig?: Record<string, unknown> }): GenerativeModel;
};

export function createGeminiProvider(name: string, model: string): Provider {
  let client: GeminiClient | null = null;

  async function getClient(): Promise<GeminiClient> {
    if (client) return client;
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        `${name}: set GOOGLE_API_KEY (or GEMINI_API_KEY) to use this provider — get a key at https://aistudio.google.com/app/apikey`,
      );
    }
    const mod = await import('@google/generative-ai');
    const GoogleGenerativeAI = mod.GoogleGenerativeAI;
    client = new GoogleGenerativeAI(apiKey) as unknown as GeminiClient;
    return client;
  }

  return {
    name,
    async complete({ prompt, vars, maxTokens, temperature }): Promise<CompletionResult> {
      const rendered = renderTemplate(prompt, vars);
      const genAI = await getClient();

      const generationConfig: Record<string, unknown> = {};
      if (maxTokens !== undefined) generationConfig.maxOutputTokens = maxTokens;
      if (temperature !== undefined) generationConfig.temperature = temperature;

      const generativeModel = genAI.getGenerativeModel({
        model,
        ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
      });

      const started = Date.now();
      const result = await withRetry(() => generativeModel.generateContent(rendered));
      const latencyMs = Date.now() - started;

      const output = result.response.text();
      const usage = result.response.usageMetadata;
      const promptTokens = usage?.promptTokenCount ?? 0;
      const completionTokens = usage?.candidatesTokenCount ?? 0;

      return {
        output,
        usage: { promptTokens, completionTokens },
        cost: computeCost(name, promptTokens, completionTokens),
        latencyMs,
        raw: result.response,
      };
    },
  };
}
