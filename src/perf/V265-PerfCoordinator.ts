/**
 * V265 PerfCoordinator - Direction D Perf Compression (Iter 21/30)
 * chatdev: Coordinate AI calls to stay within budget
 */
export interface PerfBudget {
  name: string;
  totalTokens: number;
  usedTokens: number;
  windowMs: number;
  windowStart: number;
  reservations: Array<{ id: string; tokens: number; agentId: string }>;
}

export interface CoordinatorState {
  budgets: Map<string, PerfBudget>;
  nextId: number;
  totalCoordinated: number;
  totalRejected: number;
}

export function createCoordinatorState(): CoordinatorState {
  return { budgets: new Map(), nextId: 1, totalCoordinated: 0, totalRejected: 0 };
}

export function addBudget(state: CoordinatorState, name: string, totalTokens: number, windowMs: number): CoordinatorState {
  return { ...state, budgets: new Map(state.budgets).set(name, { name, totalTokens, usedTokens: 0, windowMs, windowStart: Date.now(), reservations: [] }) };
}

export function reserveTokens(state: CoordinatorState, budgetName: string, tokens: number, agentId: string): { state: CoordinatorState; allowed: boolean; reservationId?: string } {
  const budget = state.budgets.get(budgetName);
  if (!budget) return { state, allowed: false };
  // Reset window
  const now = Date.now();
  let used = budget.usedTokens;
  let windowStart = budget.windowStart;
  if (budget.windowMs > 0 && now - windowStart >= budget.windowMs) {
    used = 0;
    windowStart = now;
  }
  const reserved = budget.reservations.reduce((a, b) => a + b.tokens, 0);
  if (used + reserved + tokens > budget.totalTokens) {
    return { state: { ...state, totalRejected: state.totalRejected + 1 }, allowed: false };
  }
  const id = `res-${state.nextId}`;
  const updated: PerfBudget = { ...budget, usedTokens: used, windowStart, reservations: [...budget.reservations, { id, tokens, agentId }] };
  return { state: { ...state, budgets: new Map(state.budgets).set(budgetName, updated), nextId: state.nextId + 1, totalCoordinated: state.totalCoordinated + 1 }, allowed: true, reservationId: id };
}

export function releaseReservation(state: CoordinatorState, budgetName: string, reservationId: string): CoordinatorState {
  const budget = state.budgets.get(budgetName);
  if (!budget) return state;
  const reservation = budget.reservations.find(r => r.id === reservationId);
  if (!reservation) return state;
  const updated: PerfBudget = { ...budget, reservations: budget.reservations.filter(r => r.id !== reservationId) };
  return { ...state, budgets: new Map(state.budgets).set(budgetName, updated) };
}

export function consumeTokens(state: CoordinatorState, budgetName: string, tokens: number): CoordinatorState {
  const budget = state.budgets.get(budgetName);
  if (!budget) return state;
  return { ...state, budgets: new Map(state.budgets).set(budgetName, { ...budget, usedTokens: budget.usedTokens + tokens }) };
}

export function getBudget(state: CoordinatorState, name: string): PerfBudget | undefined {
  return state.budgets.get(name);
}

export function getAvailableTokens(state: CoordinatorState, name: string): number {
  const budget = state.budgets.get(name);
  if (!budget) return 0;
  const reserved = budget.reservations.reduce((a, b) => a + b.tokens, 0);
  return Math.max(0, budget.totalTokens - budget.usedTokens - reserved);
}

export function getCoordinatorReport(state: CoordinatorState): { budgets: number; totalCoordinated: number; totalRejected: number; byBudget: Record<string, number> } {
  const byBudget: Record<string, number> = {};
  for (const [name, b] of state.budgets.entries()) byBudget[name] = b.usedTokens;
  return { budgets: state.budgets.size, totalCoordinated: state.totalCoordinated, totalRejected: state.totalRejected, byBudget };
}
