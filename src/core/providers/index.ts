import type { Provider } from '../types/index.js';
import { createMockProvider } from './mock.js';
import { createAnthropicProvider } from './anthropic.js';
import { createOpenAIProvider } from './openai.js';
import { createGeminiProvider } from './gemini.js';
import { createOllamaProvider } from './ollama.js';

export interface CreateProviderOptions {
  mockOutput?: string;
}

export function createProvider(name: string, options: CreateProviderOptions = {}): Provider {
  const slash = name.indexOf('/');
  const vendor = slash === -1 ? name : name.slice(0, slash);
  const model = slash === -1 ? '' : name.slice(slash + 1);

  switch (vendor) {
    case 'mock':
      return createMockProvider(name, options.mockOutput ?? '');
    case 'anthropic':
      requireModel(name, vendor, model);
      return createAnthropicProvider(name, model);
    case 'openai':
      requireModel(name, vendor, model);
      return createOpenAIProvider(name, model);
    case 'gemini':
    case 'google':
      requireModel(name, vendor, model);
      return createGeminiProvider(name, model);
    case 'ollama':
      requireModel(name, vendor, model);
      return createOllamaProvider(name, model);
    default:
      throw new Error(
        `Unknown provider "${vendor}" in "${name}".\n` +
          `  Use the format <vendor>/<model>, e.g. anthropic/claude-sonnet-4-6, openai/gpt-4o-mini, ollama/llama3.2, gemini/gemini-1.5-flash, or mock.\n` +
          `  Supported vendors: mock, anthropic, openai, gemini, ollama`,
      );
  }
}

function requireModel(full: string, vendor: string, model: string): void {
  if (!model) {
    throw new Error(
      `Provider "${full}" is missing a model — use the format "${vendor}/<model-name>", e.g. "${vendor}/${vendor === 'anthropic' ? 'claude-sonnet-4-6' : vendor === 'openai' ? 'gpt-4o-mini' : vendor === 'ollama' ? 'llama3.2' : 'gemini-1.5-flash'}".`,
    );
  }
}

export { DEFAULT_RETRY, withRetry } from './retry.js';
export { renderTemplate } from './template.js';
export { PRICING, computeCost } from './pricing.js';
export type { ModelPricing } from './pricing.js';
