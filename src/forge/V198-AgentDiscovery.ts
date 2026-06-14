/**
 * V198 AgentDiscovery - Direction B Agent Forge (Iter 14/30)
 * nanobot: Discover agents by capability/tag/role
 */
export interface DiscoveredAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  tags: string[];
  source: 'local' | 'registry' | 'federated';
  relevanceScore: number;
  discoveredAt: number;
}

export interface DiscoveryQuery {
  text?: string;
  capabilities?: string[];
  tags?: string[];
  source?: DiscoveredAgent['source'];
  limit?: number;
}

export interface DiscoveryState {
  known: Map<string, DiscoveredAgent>;
  queryHistory: Array<{ query: DiscoveryQuery; timestamp: number; resultCount: number }>;
  totalDiscoveries: number;
}

export function createDiscoveryState(): DiscoveryState {
  return { known: new Map(), queryHistory: [], totalDiscoveries: 0 };
}

export function addAgent(state: DiscoveryState, agent: Omit<DiscoveredAgent, 'discoveredAt' | 'relevanceScore'> & { relevanceScore?: number }): DiscoveryState {
  return { ...state, known: new Map(state.known).set(agent.id, { ...agent, discoveredAt: Date.now(), relevanceScore: agent.relevanceScore || 0 }) };
}

export function removeAgent(state: DiscoveryState, id: string): DiscoveryState {
  const known = new Map(state.known);
  known.delete(id);
  return { ...state, known };
}

function scoreMatch(agent: DiscoveredAgent, query: DiscoveryQuery): number {
  let score = 0;
  if (query.text) {
    const text = query.text.toLowerCase();
    if (agent.name.toLowerCase().includes(text)) score += 0.5;
    if (agent.description.toLowerCase().includes(text)) score += 0.3;
    if (agent.capabilities.some(c => c.toLowerCase().includes(text))) score += 0.4;
    if (agent.tags.some(t => t.toLowerCase().includes(text))) score += 0.3;
  }
  if (query.capabilities) {
    for (const cap of query.capabilities) {
      if (agent.capabilities.includes(cap)) score += 0.2;
    }
  }
  if (query.tags) {
    for (const tag of query.tags) {
      if (agent.tags.includes(tag)) score += 0.1;
    }
  }
  if (query.source && agent.source !== query.source) score -= 0.5;
  return score;
}

export function discover(state: DiscoveryState, query: DiscoveryQuery): { state: DiscoveryState; results: DiscoveredAgent[] } {
  const scored = Array.from(state.known.values()).map(a => ({ ...a, relevanceScore: scoreMatch(a, query) }));
  const filtered = scored.filter(a => a.relevanceScore > 0);
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const limit = query.limit || 10;
  const results = filtered.slice(0, limit);
  return {
    state: {
      ...state,
      queryHistory: [...state.queryHistory, { query, timestamp: Date.now(), resultCount: results.length }].slice(-100),
      totalDiscoveries: state.totalDiscoveries + results.length,
    },
    results,
  };
}

export function discoverByCapability(state: DiscoveryState, capability: string): { state: DiscoveryState; results: DiscoveredAgent[] } {
  return discover(state, { capabilities: [capability] });
}

export function discoverByTag(state: DiscoveryState, tag: string): { state: DiscoveryState; results: DiscoveredAgent[] } {
  return discover(state, { tags: [tag] });
}

export function clearKnown(state: DiscoveryState): DiscoveryState {
  return { ...state, known: new Map(), queryHistory: [] };
}

export function getDiscoveryReport(state: DiscoveryState): { knownAgents: number; queriesRun: number; totalDiscoveries: number; avgResultsPerQuery: number } {
  const totalResults = state.queryHistory.reduce((a, q) => a + q.resultCount, 0);
  return {
    knownAgents: state.known.size,
    queriesRun: state.queryHistory.length,
    totalDiscoveries: state.totalDiscoveries,
    avgResultsPerQuery: state.queryHistory.length > 0 ? totalResults / state.queryHistory.length : 0,
  };
}
