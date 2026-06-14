/**
 * V196 AgentDependency - Direction B Agent Forge (Iter 12/30)
 * nanobot: Resolve agent dependencies (tools/models/services)
 */
export type DependencyType = 'tool' | 'model' | 'service' | 'library';

export interface Dependency {
  name: string;
  type: DependencyType;
  versionRange: string;
  required: boolean;
}

export interface AgentDep {
  agentId: string;
  deps: Dependency[];
  resolved: Map<string, { version: string; source: string }>;
  unresolved: string[];
}

export interface DependencyState {
  agents: Map<string, AgentDep>;
  available: Map<string, { versions: string[]; latest: string }>;
}

export function createDependencyState(): DependencyState {
  return { agents: new Map(), available: new Map() };
}

export function registerAgentDeps(state: DependencyState, agentId: string, deps: Dependency[]): DependencyState {
  return { ...state, agents: new Map(state.agents).set(agentId, { agentId, deps, resolved: new Map(), unresolved: [] }) };
}

export function addAvailablePackage(state: DependencyState, name: string, versions: string[]): DependencyState {
  const latest = versions.sort().reverse()[0] || '0.0.0';
  return { ...state, available: new Map(state.available).set(name, { versions, latest }) };
}

function satisfiesRange(version: string, range: string): boolean {
  if (range === '*' || range === 'latest') return true;
  const match = range.match(/^([\^~])?(.+)$/);
  if (!match) return version === range;
  const op = match[1] || '=';
  const target = match[2];
  if (op === '^') {
    const [maj] = target.split('.').map(Number);
    const [vmaj] = version.split('.').map(Number);
    return vmaj === maj;
  }
  if (op === '~') {
    const [maj, min] = target.split('.').map(Number);
    const [vmaj, vmin] = version.split('.').map(Number);
    return vmaj === maj && vmin === min;
  }
  return version === target;
}

export function resolveDependencies(state: DependencyState, agentId: string): DependencyState {
  const agent = state.agents.get(agentId);
  if (!agent) return state;
  const resolved = new Map<string, { version: string; source: string }>();
  const unresolved: string[] = [];
  for (const dep of agent.deps) {
    const pkg = state.available.get(dep.name);
    if (!pkg) {
      unresolved.push(dep.name);
      continue;
    }
    const matching = pkg.versions.find(v => satisfiesRange(v, dep.versionRange));
    if (matching) {
      resolved.set(dep.name, { version: matching, source: 'registry' });
    } else if (dep.required) {
      unresolved.push(dep.name);
    } else {
      resolved.set(dep.name, { version: pkg.latest, source: 'fallback' });
    }
  }
  const updated: AgentDep = { ...agent, resolved, unresolved };
  return { ...state, agents: new Map(state.agents).set(agentId, updated) };
}

export function getUnresolvedDeps(state: DependencyState, agentId: string): string[] {
  return state.agents.get(agentId)?.unresolved || [];
}

export function hasUnresolvedRequiredDeps(state: DependencyState, agentId: string): boolean {
  return getUnresolvedDeps(state, agentId).length > 0;
}

export function getDependencyReport(state: DependencyState): { agents: number; totalDeps: number; resolved: number; unresolved: number } {
  let totalDeps = 0, resolved = 0, unresolved = 0;
  for (const a of state.agents.values()) {
    totalDeps += a.deps.length;
    resolved += a.resolved.size;
    unresolved += a.unresolved.length;
  }
  return { agents: state.agents.size, totalDeps, resolved, unresolved };
}
