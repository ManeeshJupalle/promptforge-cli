import type { StoredAssertion } from '../lib/types.js';
import { ContainsRenderer } from './renderers/Contains.js';
import { RegexRenderer } from './renderers/Regex.js';
import { JsonSchemaRenderer } from './renderers/JsonSchema.js';
import { SemanticSimilarityRenderer } from './renderers/SemanticSimilarity.js';
import { LlmJudgeRenderer } from './renderers/LlmJudge.js';
import { SnapshotRenderer } from './renderers/Snapshot.js';
import { CostRenderer } from './renderers/Cost.js';
import { LatencyRenderer } from './renderers/Latency.js';
import { CustomRenderer } from './renderers/Custom.js';
import { FallbackRenderer } from './renderers/Fallback.js';
import { StatusBadge, type RendererProps } from './renderers/common.js';

// Dispatcher. Adding a new assertion type = adding one renderer file and one
// line in this registry. Unknown types fall through to the FallbackRenderer
// (JSON pretty-print) so the dashboard never blanks out on future data.
const REGISTRY: Record<string, React.FC<RendererProps>> = {
  contains: ContainsRenderer,
  notContains: ContainsRenderer,
  regex: RegexRenderer,
  jsonSchema: JsonSchemaRenderer,
  semanticSimilarity: SemanticSimilarityRenderer,
  llmJudge: LlmJudgeRenderer,
  snapshot: SnapshotRenderer,
  cost: CostRenderer,
  latency: LatencyRenderer,
  custom: CustomRenderer,
};

export function AssertionRow({ assertion }: { assertion: StoredAssertion }) {
  const Renderer = REGISTRY[assertion.type] ?? FallbackRenderer;
  return (
    <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge passed={assertion.passed} />
          <span className="font-mono text-[11px] font-medium text-[color:var(--color-text-dim)]">
            {assertion.type}
          </span>
        </div>
      </div>
      {assertion.message && !assertion.passed && (
        <div className="mb-1 font-mono text-xs text-[color:var(--color-fail)]">
          {assertion.message}
        </div>
      )}
      <Renderer assertion={assertion} />
    </div>
  );
}
