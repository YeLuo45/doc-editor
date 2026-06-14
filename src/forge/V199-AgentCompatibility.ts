/**
 * V199 AgentCompatibility - Direction B Agent Forge (Iter 15/30)
 * nanobot: Check compatibility between agent versions
 */
export type CompatibilityLevel = 'compatible' | 'minor_breaking' | 'major_breaking' | 'unknown';

export interface CompatibilityCheck {
  agentId: string;
  fromVersion: string;
  toVersion: string;
  level: CompatibilityLevel;
  breakingChanges: string[];
  recommendations: string[];
}

export interface CompatibilityRule {
  name: string;
  description: string;
  check: (from: any, to: any) => boolean;
}

export interface CompatibilityState {
  history: CompatibilityCheck[];
  customRules: CompatibilityRule[];
}

export function createCompatibilityState(): CompatibilityState {
  return { history: [], customRules: [] };
}

export function addCustomRule(state: CompatibilityState, rule: CompatibilityRule): CompatibilityState {
  return { ...state, customRules: [...state.customRules, rule] };
}

export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const m = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return { major: 0, minor: 0, patch: 0 };
  return { major: parseInt(m[1]), minor: parseInt(m[2]), patch: parseInt(m[3] || '0') };
}

export function checkCompatibility(state: CompatibilityState, agentId: string, fromVersion: string, toVersion: string, fromDef?: any, toDef?: any): { state: CompatibilityState; check: CompatibilityCheck } {
  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);
  const breakingChanges: string[] = [];
  const recommendations: string[] = [];
  let level: CompatibilityLevel = 'compatible';
  if (to.major > from.major) {
    level = 'major_breaking';
    breakingChanges.push('Major version bump - breaking changes likely');
    recommendations.push('Review migration guide before upgrading');
  } else if (to.minor > from.minor) {
    level = 'minor_breaking';
    breakingChanges.push('Minor version bump - new features, may have deprecations');
    recommendations.push('Test existing workflows');
  } else if (from.major > to.major) {
    level = 'major_breaking';
    breakingChanges.push('Downgrading major version');
    recommendations.push('Consider keeping current version');
  } else if (from.major === 0 && to.major === 0) {
    if (from.minor !== to.minor || from.patch !== to.patch) {
      level = 'minor_breaking';
      breakingChanges.push('Pre-1.0 version change');
    }
  }
  // Check custom rules
  if (fromDef && toDef) {
    for (const rule of state.customRules) {
      if (rule.check(fromDef, toDef)) {
        breakingChanges.push(rule.description);
        if (level === 'compatible') level = 'minor_breaking';
      }
    }
  }
  const check: CompatibilityCheck = { agentId, fromVersion, toVersion, level, breakingChanges, recommendations };
  return { state: { ...state, history: [...state.history, check].slice(-200) }, check };
}

export function getHistoryForAgent(state: CompatibilityState, agentId: string): CompatibilityCheck[] {
  return state.history.filter(c => c.agentId === agentId);
}

export function getBreakingChanges(state: CompatibilityState, agentId: string): CompatibilityCheck[] {
  return state.history.filter(c => c.agentId === agentId && c.level !== 'compatible');
}

export function clearHistory(state: CompatibilityState): CompatibilityState {
  return { ...state, history: [] };
}

export function getCompatibilityReport(state: CompatibilityState): { totalChecks: number; byLevel: Record<string, number>; customRules: number } {
  const byLevel: Record<string, number> = {};
  for (const c of state.history) byLevel[c.level] = (byLevel[c.level] || 0) + 1;
  return { totalChecks: state.history.length, byLevel, customRules: state.customRules.length };
}
