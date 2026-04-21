import type { CompletionResult } from '../types/index.js';

export interface AssertionContext {
  output: string;
  completion: CompletionResult;
  testFile: string;
  testName: string;
  providerName: string;
  suiteProviders: string[];
  projectRoot: string;
  snapshotOptions: { update: boolean };
  // Default snapshot cosine-similarity threshold, resolved from project config
  // (`snapshotThreshold` in promptforge.config.ts) or the hardcoded 0.9.
  // An assertion's own `similarity:` field still overrides this.
  snapshotThreshold: number;
}
