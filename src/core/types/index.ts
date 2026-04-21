export interface CompletionResult {
  output: string;
  usage: { promptTokens: number; completionTokens: number };
  cost: number;
  latencyMs: number;
  raw?: unknown;
}

export interface Provider {
  name: string;
  complete(params: {
    prompt: string;
    vars: Record<string, unknown>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<CompletionResult>;
}

export interface AssertionResult {
  type: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface TestResult {
  name: string;
  file: string;
  provider: string;
  passed: boolean;
  output: string;
  assertions: AssertionResult[];
  latencyMs: number;
  cost: number;
  error?: string;
  // Day 4 additions — captured per-test so they can be written to the
  // results table. They're optional in the runtime type because
  // pre-Day-4 callers (tests, dashboards) shouldn't be forced to set them.
  inputVars?: Record<string, unknown>;
  promptTokens?: number;
  completionTokens?: number;
}
