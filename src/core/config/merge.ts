import type { MergedTestSuite, TestSuite } from './schema.js';
import type { ProjectConfig } from './project.js';

export interface ResolvedDefaults {
  providers: string[];
  snapshotThreshold: number;
  testDir: string;
}

export const HARDCODED_DEFAULTS: ResolvedDefaults = {
  providers: ['mock'],
  snapshotThreshold: 0.9,
  testDir: 'prompts',
};

// Explicit three-tier merge: per-suite overrides project, project overrides
// hardcoded defaults. No Object.assign trickery — every field is applied
// deliberately so precedence is auditable at a glance.
export function mergeSuite(suite: TestSuite, project: ProjectConfig | null): MergedTestSuite {
  const projectProviders = project?.providers?.defaultModels;
  // `suite.providers` is undefined when the user omitted `providers:` from
  // YAML/TS. Only an explicit, non-empty array counts as a per-suite pin.
  const providers =
    suite.providers && suite.providers.length > 0
      ? suite.providers
      : projectProviders && projectProviders.length > 0
        ? projectProviders
        : HARDCODED_DEFAULTS.providers;

  return {
    ...suite,
    providers,
  };
}

export function resolveDefaults(project: ProjectConfig | null): ResolvedDefaults {
  return {
    providers:
      project?.providers?.defaultModels && project.providers.defaultModels.length > 0
        ? project.providers.defaultModels
        : HARDCODED_DEFAULTS.providers,
    snapshotThreshold: project?.snapshotThreshold ?? HARDCODED_DEFAULTS.snapshotThreshold,
    testDir: project?.testDir ?? HARDCODED_DEFAULTS.testDir,
  };
}
