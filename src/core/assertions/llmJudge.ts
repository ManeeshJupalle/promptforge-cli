import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';
import { PRICING, createProvider, renderTemplate } from '../providers/index.js';

const JUDGE_TEMPLATE = `You are an evaluator. Grade the output against the criteria.

Criteria: {{criteria}}

Output:
{{output}}

Respond with ONLY a single JSON object on one line in this exact shape, no prose before or after:
{"score": <integer from 1 to 5>, "reasoning": "<one-sentence explanation>"}`;

export async function assertLlmJudge(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const criteria = raw.criteria;
  if (typeof criteria !== 'string') {
    return {
      type: 'llmJudge',
      passed: false,
      message: 'llmJudge assertion requires a string `criteria`',
    };
  }
  const threshold = typeof raw.threshold === 'number' ? raw.threshold : 4;
  const judgeModel =
    typeof raw.judgeModel === 'string' ? raw.judgeModel : selectJudge(ctx.suiteProviders);
  if (!judgeModel) {
    return {
      type: 'llmJudge',
      passed: false,
      message:
        'llmJudge: no `judgeModel` specified and no provider in the suite could serve as judge',
    };
  }

  const prompt = renderTemplate(JUDGE_TEMPLATE, {
    criteria,
    output: ctx.output,
  });

  let response;
  try {
    const judge = createProvider(judgeModel);
    response = await judge.complete({ prompt, vars: {} });
  } catch (err) {
    return {
      type: 'llmJudge',
      passed: false,
      message: `llmJudge failed calling ${judgeModel}: ${(err as Error).message}`,
      details: { judgeModel },
    };
  }

  const parsed = parseJudgeResponse(response.output);
  if (!parsed) {
    return {
      type: 'llmJudge',
      passed: false,
      message: `llmJudge response could not be parsed as JSON (judge: ${judgeModel})`,
      details: { judgeModel, raw: response.output.slice(0, 300) },
    };
  }

  const passed = parsed.score >= threshold;
  return {
    type: 'llmJudge',
    passed,
    message: passed
      ? undefined
      : `llmJudge score ${parsed.score}/5 below threshold ${threshold} — ${parsed.reasoning}`,
    details: {
      judgeModel,
      score: parsed.score,
      reasoning: parsed.reasoning,
      threshold,
      judgeCost: response.cost,
      judgeLatencyMs: response.latencyMs,
    },
  };
}

function parseJudgeResponse(text: string): { score: number; reasoning: string } | null {
  const candidate = extractJson(text);
  if (!candidate || typeof candidate !== 'object') return null;
  const obj = candidate as Record<string, unknown>;
  const score =
    typeof obj.score === 'number' ? obj.score : typeof obj.score === 'string' ? Number(obj.score) : NaN;
  const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning : '';
  if (!Number.isFinite(score)) return null;
  return { score, reasoning };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

function selectJudge(providers: string[]): string {
  if (providers.length === 0) return '';
  const ranked = [...providers].sort((a, b) => judgeRank(a) - judgeRank(b));
  return ranked[0];
}

// Lower rank = preferred. Mock ranks last (it can't actually grade). Unknown
// pricing sits between ollama/* and paid providers to avoid surprise bills.
function judgeRank(name: string): number {
  if (name === 'mock' || name.startsWith('mock/')) return Number.MAX_VALUE;
  const entry = PRICING[name];
  if (!entry) return 1_000_000;
  return entry.input + entry.output;
}
