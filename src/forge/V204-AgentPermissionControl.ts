/**
 * V204 AgentPermissionControl - Direction B Agent Forge (Iter 20/30)
 * ruflo: Fine-grained permission policies per agent
 */
export type Permission = 'read' | 'write' | 'delete' | 'execute' | 'network' | 'admin';
export type Effect = 'allow' | 'deny';

export interface PolicyRule {
  id: string;
  agentId: string;
  permission: Permission;
  resource: string;     // pattern or specific
  effect: Effect;
  priority: number;
}

export interface PermissionState {
  rules: Map<string, PolicyRule>;
  decisions: Array<{ agentId: string; permission: Permission; resource: string; effect: Effect; timestamp: number }>;
  nextId: number;
}

export function createPermissionState(): PermissionState {
  return { rules: new Map(), decisions: [], nextId: 1 };
}

export function addRule(state: PermissionState, agentId: string, permission: Permission, resource: string, effect: Effect, priority: number = 5): { state: PermissionState; ruleId: string } {
  const id = `rule-${state.nextId}`;
  const rule: PolicyRule = { id, agentId, permission, resource, effect, priority };
  return { state: { ...state, rules: new Map(state.rules).set(id, rule), nextId: state.nextId + 1 }, ruleId: id };
}

export function removeRule(state: PermissionState, ruleId: string): PermissionState {
  const rules = new Map(state.rules);
  rules.delete(ruleId);
  return { ...state, rules };
}

export function checkPermission(state: PermissionState, agentId: string, permission: Permission, resource: string): { state: PermissionState; allowed: boolean; matchedRule?: string } {
  const candidates = Array.from(state.rules.values()).filter(r => r.agentId === agentId && r.permission === permission).sort((a, b) => b.priority - a.priority);
  let allowed = false;
  let matchedRule: string | undefined;
  for (const rule of candidates) {
    if (resourceMatches(resource, rule.resource)) {
      if (rule.effect === 'allow') allowed = true;
      else if (rule.effect === 'deny') { allowed = false; matchedRule = rule.id; break; }
      matchedRule = rule.id;
    }
  }
  return { state: { ...state, decisions: [...state.decisions, { agentId, permission, resource, effect: allowed ? 'allow' : 'deny', timestamp: Date.now() }].slice(-1000) }, allowed, matchedRule };
}

function resourceMatches(actual: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === actual) return true;
  if (pattern.endsWith('*')) return actual.startsWith(pattern.slice(0, -1));
  return false;
}

export function getRulesForAgent(state: PermissionState, agentId: string): PolicyRule[] {
  return Array.from(state.rules.values()).filter(r => r.agentId === agentId);
}

export function getDecisionsByAgent(state: PermissionState, agentId: string): PermissionState['decisions'] {
  return state.decisions.filter(d => d.agentId === agentId);
}

export function clearDecisions(state: PermissionState): PermissionState {
  return { ...state, decisions: [] };
}

export function getPermissionReport(state: PermissionState): { rules: number; decisions: number; allowRate: number } {
  const allow = state.decisions.filter(d => d.effect === 'allow').length;
  return { rules: state.rules.size, decisions: state.decisions.length, allowRate: state.decisions.length > 0 ? allow / state.decisions.length : 0 };
}
