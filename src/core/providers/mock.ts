import type { CompletionResult, Provider } from '../types/index.js';

// Day 1 placeholder. Returns whatever output the test supplied via `mockOutput`.
// Real providers (Anthropic / OpenAI / Ollama / Gemini) land in Day 2.
export function createMockProvider(name: string, fixedOutput: string): Provider {
  return {
    name,
    async complete(): Promise<CompletionResult> {
      return {
        output: fixedOutput,
        usage: { promptTokens: 0, completionTokens: 0 },
        cost: 0,
        latencyMs: 0,
      };
    },
  };
}
