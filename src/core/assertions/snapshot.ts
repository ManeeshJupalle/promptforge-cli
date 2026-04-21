import type { Assertion } from '../config/schema.js';
import type { AssertionResult } from '../types/index.js';
import type { AssertionContext } from './context.js';
import { cosineSimilarity, embed } from '../embeddings/index.js';
import { readSnapshot, writeSnapshot } from '../snapshots/store.js';

export async function assertSnapshot(ctx: AssertionContext, raw: Assertion): Promise<AssertionResult> {
  const threshold = typeof raw.similarity === 'number' ? raw.similarity : ctx.snapshotThreshold;
  const existing = await readSnapshot(ctx);

  if (!existing) {
    const embedding = await embed(ctx.output);
    await writeSnapshot(ctx, { output: ctx.output, embedding });
    return { type: 'snapshot', passed: true, message: 'snapshot recorded (first run)' };
  }

  if (ctx.snapshotOptions.update) {
    const embedding = await embed(ctx.output);
    await writeSnapshot(ctx, { output: ctx.output, embedding });
    return { type: 'snapshot', passed: true, message: 'snapshot updated' };
  }

  // Legacy rows migrated from flat JSON without an embedding. Re-embed and
  // treat as a fresh pass rather than a failure.
  if (!existing.embedding) {
    const embedding = await embed(ctx.output);
    await writeSnapshot(ctx, { output: existing.output, embedding });
    return {
      type: 'snapshot',
      passed: true,
      message: 'snapshot embedding upgraded',
    };
  }

  const currentEmb = await embed(ctx.output);
  const similarity = cosineSimilarity(currentEmb, existing.embedding);
  const passed = similarity >= threshold;

  return {
    type: 'snapshot',
    passed,
    message: passed
      ? undefined
      : `snapshot drift: similarity ${similarity.toFixed(3)} below threshold ${threshold.toFixed(3)} — run \`promptforge snapshot --update\` to accept`,
    details: {
      similarity,
      threshold,
      stored: existing.output.slice(0, 200),
      received: ctx.output.slice(0, 200),
    },
  };
}
