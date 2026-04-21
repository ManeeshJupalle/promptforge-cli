// Shared local embedding pipeline for `semanticSimilarity` and `snapshot`.
// Uses Xenova/all-MiniLM-L6-v2 (384-dim). Model downloads on first use (~25MB)
// and caches under the OS transformers.js cache dir — subsequent calls are fast.
// The SDK is dynamic-imported so mock-only / non-embedding runs never pay its
// startup cost (transformers.js bundles onnxruntime + WASM).

type FeatureExtractionPipeline = (
  text: string | string[],
  opts?: { pooling?: 'mean' | 'cls' | 'none'; normalize?: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const mod = await import('@xenova/transformers');
      // Cast through unknown — the @xenova/transformers types are a lot broader
      // than what we actually use (we only invoke a feature-extraction pipeline).
      return (await mod.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      )) as unknown as FeatureExtractionPipeline;
    })();
  }
  return pipelinePromise;
}

export async function embed(text: string): Promise<Float32Array> {
  const pipe = await getPipeline();
  const result = await pipe(text, { pooling: 'mean', normalize: true });
  return new Float32Array(result.data);
}

export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  // Inputs are assumed normalized (we always pass normalize: true above), so
  // cosine similarity collapses to a dot product.
  if (a.length !== b.length) {
    throw new Error(`embedding length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
