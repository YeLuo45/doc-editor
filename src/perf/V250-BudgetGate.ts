/**
 * V250 BudgetGate - Direction D Perf Compression (Iter 6/30)
 * thunderbolt: Budget enforcement - reject/queue when budget exceeded
 */
export type GateAction = 'allow' | 'reject' | 'queue';

export interface BudgetConfig {
  name: string;
  limit: number;
  unit: 'requests' | 'tokens' | 'cost' | 'time_ms';
  windowMs: number;        // 0 = no window (lifetime)
  action: GateAction;
}

export interface BudgetState {
  configs: Map<string, BudgetConfig>;
  usage: Map<string, { used: number; windowStart: number; queued: number }>;
  totalAllowed: number;
  totalRejected: number;
  totalQueued: number;
}

export function createBudgetState(): BudgetState {
  return { configs: new Map(), usage: new Map(), totalAllowed: 0, totalRejected: 0, totalQueued: 0 };
}

export function addBudget(state: BudgetState, config: BudgetConfig): BudgetState {
  return { ...state, configs: new Map(state.configs).set(config.name, config), usage: new Map(state.usage).set(config.name, { used: 0, windowStart: Date.now(), queued: 0 }) };
}

export function removeBudget(state: BudgetState, name: string): BudgetState {
  const configs = new Map(state.configs);
  configs.delete(name);
  const usage = new Map(state.usage);
  usage.delete(name);
  return { ...state, configs, usage };
}

export function checkBudget(state: BudgetState, name: string, amount: number = 1): { state: BudgetState; action: GateAction; remaining: number } {
  const config = state.configs.get(name);
  const u = state.usage.get(name);
  if (!config || !u) return { state, action: 'allow', remaining: Infinity };
  const now = Date.now();
  // Reset window if needed
  let used = u.used;
  let windowStart = u.windowStart;
  if (config.windowMs > 0 && now - windowStart >= config.windowMs) {
    used = 0;
    windowStart = now;
  }
  if (used + amount > config.limit) {
    if (config.action === 'reject') {
      return { state: { ...state, usage: new Map(state.usage).set(name, { used, windowStart, queued: u.queued }), totalRejected: state.totalRejected + 1 }, action: 'reject', remaining: Math.max(0, config.limit - used) };
    } else if (config.action === 'queue') {
      return { state: { ...state, usage: new Map(state.usage).set(name, { used, windowStart, queued: u.queued + 1 }), totalQueued: state.totalQueued + 1 }, action: 'queue', remaining: 0 };
    } else {
      return { state, action: 'allow', remaining: 0 };
    }
  }
  return { state: { ...state, usage: new Map(state.usage).set(name, { used: used + amount, windowStart, queued: u.queued }), totalAllowed: state.totalAllowed + 1 }, action: 'allow', remaining: config.limit - used - amount };
}

export function consumeBudget(state: BudgetState, name: string, amount: number = 1): BudgetState {
  const r = checkBudget(state, name, amount);
  if (r.action === 'allow') return r.state;
  return state;
}

export function resetBudget(state: BudgetState, name: string): BudgetState {
  const u = state.usage.get(name);
  if (!u) return state;
  return { ...state, usage: new Map(state.usage).set(name, { ...u, used: 0, windowStart: Date.now(), queued: 0 }) };
}

export function getBudgetUsage(state: BudgetState, name: string): number {
  return state.usage.get(name)?.used || 0;
}

export function getBudgetReport(state: BudgetState): { budgets: number; totalAllowed: number; totalRejected: number; totalQueued: number; byBudget: Record<string, number> } {
  const byBudget: Record<string, number> = {};
  for (const [name, u] of state.usage.entries()) byBudget[name] = u.used;
  return { budgets: state.configs.size, totalAllowed: state.totalAllowed, totalRejected: state.totalRejected, totalQueued: state.totalQueued, byBudget };
}
