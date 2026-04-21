import type { CompletionResult, Provider } from '../types/index.js';
import { computeCost } from './pricing.js';
import { renderTemplate } from './template.js';
import { withRetry } from './retry.js';

interface OllamaGenerateResponse {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  done?: boolean;
}

export function createOllamaProvider(name: string, model: string): Provider {
  const baseUrl = (process.env.OLLAMA_HOST ?? 'http://localhost:11434').replace(/\/$/, '');

  return {
    name,
    async complete({ prompt, vars, maxTokens, temperature }): Promise<CompletionResult> {
      const rendered = renderTemplate(prompt, vars);

      const options: Record<string, unknown> = {};
      if (temperature !== undefined) options.temperature = temperature;
      if (maxTokens !== undefined) options.num_predict = maxTokens;

      const body = {
        model,
        prompt: rendered,
        stream: false,
        ...(Object.keys(options).length > 0 ? { options } : {}),
      };

      const started = Date.now();
      const json = await withRetry(async () => {
        let res: Response;
        try {
          res = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } catch (err) {
          throw new Error(
            `${name}: could not reach Ollama at ${baseUrl} — is the daemon running? (${(err as Error).message})\n  Start it with \`ollama serve\`, or point PromptForge at a different host via OLLAMA_HOST.`,
          );
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const e = new Error(`${name}: Ollama ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`) as Error & { status?: number };
          e.status = res.status;
          throw e;
        }
        return (await res.json()) as OllamaGenerateResponse;
      });
      const latencyMs = Date.now() - started;

      const promptTokens = json.prompt_eval_count ?? 0;
      const completionTokens = json.eval_count ?? 0;

      return {
        output: json.response ?? '',
        usage: { promptTokens, completionTokens },
        cost: computeCost(name, promptTokens, completionTokens),
        latencyMs,
        raw: json,
      };
    },
  };
}
