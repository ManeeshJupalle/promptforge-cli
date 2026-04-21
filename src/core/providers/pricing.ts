// USD per 1M tokens. Refresh periodically from each provider's pricing page:
//   Anthropic: https://www.anthropic.com/pricing
//   OpenAI:   https://openai.com/api/pricing
//   Gemini:   https://ai.google.dev/pricing
// Ollama runs locally and is free.
export interface ModelPricing {
  input: number;
  output: number;
}

export const PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude
  'anthropic/claude-opus-4-7': { input: 15.0, output: 75.0 },
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-haiku-4-5': { input: 1.0, output: 5.0 },

  // OpenAI
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4-turbo': { input: 10.0, output: 30.0 },

  // Google Gemini
  'gemini/gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini/gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini/gemini-1.5-flash': { input: 0.075, output: 0.3 },

  // Ollama (local, free)
  'ollama/llama3.2': { input: 0, output: 0 },
  'ollama/llama3.1': { input: 0, output: 0 },
  'ollama/mistral': { input: 0, output: 0 },
  'ollama/phi3': { input: 0, output: 0 },
  'ollama/tinyllama': { input: 0, output: 0 },
};

export function computeCost(
  providerKey: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const entry = PRICING[providerKey];
  if (!entry) {
    // ollama/* defaults to free even for unlisted local models
    if (providerKey.startsWith('ollama/')) return 0;
    return 0;
  }
  return (
    (promptTokens / 1_000_000) * entry.input +
    (completionTokens / 1_000_000) * entry.output
  );
}
