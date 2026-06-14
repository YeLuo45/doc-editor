/**
 * V289 TrustRouter - Direction E Trust Verification (Iter 15/30)
 * nanobot: Route trust verifications to right validators
 */
export type ValidatorType = 'signature' | 'hash' | 'provenance' | 'policies' | 'external';

export interface ValidatorRoute {
  id: string;
  name: string;
  type: ValidatorType;
  pattern: RegExp;       // docId pattern
  priority: number;
  active: boolean;
}

export interface RoutedVerification {
  validatorId: string;
  docId: string;
  timestamp: number;
  result: 'passed' | 'failed' | 'pending';
}

export interface TrustRouterState {
  routes: ValidatorRoute[];
  history: RoutedVerification[];
  totalRouted: number;
  nextValidatorId: number;
}

export function createTrustRouterState(): TrustRouterState {
  return { routes: [], history: [], totalRouted: 0, nextValidatorId: 1 };
}

export function addValidatorRoute(state: TrustRouterState, name: string, type: ValidatorType, pattern: RegExp, priority: number = 5): { state: TrustRouterState; routeId: string } {
  const id = `route-${state.nextValidatorId}`;
  const route: ValidatorRoute = { id, name, type, pattern, priority, active: true };
  return { state: { ...state, routes: [...state.routes, route], nextValidatorId: state.nextValidatorId + 1 }, routeId: id };
}

export function setRouteActive(state: TrustRouterState, routeId: string, active: boolean): TrustRouterState {
  return { ...state, routes: state.routes.map(r => r.id === routeId ? { ...r, active } : r) };
}

export function routeDoc(state: TrustRouterState, docId: string): { state: TrustRouterState; matched: ValidatorRoute[] } {
  const matched = state.routes.filter(r => r.active && r.pattern.test(docId)).sort((a, b) => b.priority - a.priority);
  return { state: { ...state, totalRouted: state.totalRouted + 1 }, matched };
}

export function recordVerification(state: TrustRouterState, validatorId: string, docId: string, result: RoutedVerification['result']): TrustRouterState {
  const verification: RoutedVerification = { validatorId, docId, timestamp: Date.now(), result };
  return { ...state, history: [...state.history, verification].slice(-500) };
}

export function getRoute(state: TrustRouterState, routeId: string): ValidatorRoute | undefined {
  return state.routes.find(r => r.id === routeId);
}

export function getVerificationsForDoc(state: TrustRouterState, docId: string): RoutedVerification[] {
  return state.history.filter(v => v.docId === docId);
}

export function getFailedVerifications(state: TrustRouterState): RoutedVerification[] {
  return state.history.filter(v => v.result === 'failed');
}

export function clearRouterState(state: TrustRouterState): TrustRouterState {
  return createTrustRouterState();
}

export function getTrustRouterReport(state: TrustRouterState): { routes: number; totalRouted: number; failed: number; pending: number } {
  return { routes: state.routes.length, totalRouted: state.totalRouted, failed: getFailedVerifications(state).length, pending: state.history.filter(v => v.result === 'pending').length };
}
