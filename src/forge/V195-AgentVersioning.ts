/**
 * V195 AgentVersioning - Direction B Agent Forge (Iter 11/30)
 * nanobot: Version control for agent definitions (semver)
 */
export type VersionBump = 'major' | 'minor' | 'patch';

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface VersionedAgent {
  id: string;
  version: string;
  changelog: string;
  createdAt: number;
  parentVersion?: string;
}

export interface VersionState {
  agents: Map<string, VersionedAgent[]>;
  bumpCounts: Map<VersionBump, number>;
}

export function createVersionState(): VersionState {
  return { agents: new Map(), bumpCounts: new Map() };
}

export function parseVersion(version: string): Version {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+([\w.]+))?$/);
  if (!match) return { major: 0, minor: 0, patch: 0 };
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    prerelease: match[4],
    build: match[5],
  };
}

export function formatVersion(v: Version): string {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease) s += `-${v.prerelease}`;
  if (v.build) s += `+${v.build}`;
  return s;
}

export function bumpVersion(current: string, bump: VersionBump, prerelease?: string): string {
  const v = parseVersion(current);
  if (bump === 'major') return formatVersion({ major: v.major + 1, minor: 0, patch: 0, prerelease });
  if (bump === 'minor') return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0, prerelease });
  return formatVersion({ major: v.major, minor: v.minor, patch: v.patch + 1, prerelease });
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;
  return 0;
}

export function publishVersion(state: VersionState, agentId: string, version: string, changelog: string, parentVersion?: string): VersionState {
  const versioned: VersionedAgent = { id: agentId, version, changelog, createdAt: Date.now(), parentVersion };
  const existing = state.agents.get(agentId) || [];
  return { ...state, agents: new Map(state.agents).set(agentId, [...existing, versioned]) };
}

export function getVersionHistory(state: VersionState, agentId: string): VersionedAgent[] {
  return state.agents.get(agentId) || [];
}

export function getLatestVersion(state: VersionState, agentId: string): VersionedAgent | undefined {
  const history = state.agents.get(agentId) || [];
  return history[history.length - 1];
}

export function recordBump(state: VersionState, bump: VersionBump): VersionState {
  const counts = new Map(state.bumpCounts);
  counts.set(bump, (counts.get(bump) || 0) + 1);
  return { ...state, bumpCounts: counts };
}

export function getVersionReport(state: VersionState): { agents: number; totalVersions: number; byBump: Record<string, number> } {
  let total = 0;
  for (const v of state.agents.values()) total += v.length;
  const byBump: Record<string, number> = {};
  for (const [k, v] of state.bumpCounts.entries()) byBump[k] = v;
  return { agents: state.agents.size, totalVersions: total, byBump };
}
