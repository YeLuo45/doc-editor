/**
 * V226 SyncRouter - Direction C Doc Federation (Iter 12/30)
 * nanobot: Route sync messages to correct device/topic
 */
export interface RouteRule {
  id: string;
  pattern: string;        // topic pattern (supports *)
  targetDeviceIds: string[];
  priority: number;
}

export interface Route {
  messageId: string;
  topic: string;
  targetDeviceIds: string[];
  ruleId: string;
}

export interface SyncRouterState {
  rules: RouteRule[];
  routes: Route[];
  totalRouted: number;
  dropped: number;
}

export function createSyncRouterState(): SyncRouterState {
  return { rules: [], routes: [], totalRouted: 0, dropped: 0 };
}

export function addRouteRule(state: SyncRouterState, pattern: string, targetDeviceIds: string[], priority: number = 5): { state: SyncRouterState; ruleId: string } {
  const id = `rule-${state.rules.length + 1}`;
  const rule: RouteRule = { id, pattern, targetDeviceIds, priority };
  return { state: { ...state, rules: [...state.rules, rule] }, ruleId: id };
}

export function removeRouteRule(state: SyncRouterState, id: string): SyncRouterState {
  return { ...state, rules: state.rules.filter(r => r.id !== id) };
}

export function route(state: SyncRouterState, messageId: string, topic: string): { state: SyncRouterState; route?: Route } {
  const matching = state.rules.filter(r => matchPattern(topic, r.pattern)).sort((a, b) => b.priority - a.priority);
  if (matching.length === 0) {
    return { state: { ...state, dropped: state.dropped + 1 } };
  }
  const top = matching[0];
  const route: Route = { messageId, topic, targetDeviceIds: top.targetDeviceIds, ruleId: top.id };
  return { state: { ...state, routes: [...state.routes, route], totalRouted: state.totalRouted + 1 }, route };
}

function matchPattern(topic: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === topic) return true;
  if (pattern.endsWith('*')) return topic.startsWith(pattern.slice(0, -1));
  return false;
}

export function getRulesForTarget(state: SyncRouterState, deviceId: string): RouteRule[] {
  return state.rules.filter(r => r.targetDeviceIds.includes(deviceId));
}

export function getRoutesByMessage(state: SyncRouterState, messageId: string): Route[] {
  return state.routes.filter(r => r.messageId === messageId);
}

export function getSyncRouterReport(state: SyncRouterState): { rules: number; routes: number; routed: number; dropped: number } {
  return { rules: state.rules.length, routes: state.routes.length, routed: state.totalRouted, dropped: state.dropped };
}
