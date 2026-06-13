/**
 * V174 MindQuotaManager - Direction A Writing Mind (Iter 20/30)
 * ruflo: token/word/iteration budget (rate limit + cost tracking)
 */
export type QuotaType = 'tokens' | 'words' | 'iterations' | 'cost' | 'requests';

export interface QuotaLimit {
  type: QuotaType;
  limit: number;
  used: number;
  window: 'session' | 'day' | 'month' | 'total';
  windowStart: number;
}

export interface QuotaState {
  limits: QuotaLimit[];
  resets: Array<{ type: QuotaType; timestamp: number }>;
  violations: Array<{ type: QuotaType; timestamp: number; attempted: number }>;
}

export function createQuotaState(): QuotaState {
  return {
    limits: [
      { type: 'tokens', limit: 100000, used: 0, window: 'day', windowStart: Date.now() },
      { type: 'words', limit: 50000, used: 0, window: 'day', windowStart: Date.now() },
      { type: 'iterations', limit: 200, used: 0, window: 'session', windowStart: Date.now() },
      { type: 'cost', limit: 10, used: 0, window: 'month', windowStart: Date.now() },
      { type: 'requests', limit: 1000, used: 0, window: 'day', windowStart: Date.now() },
    ],
    resets: [],
    violations: [],
  };
}

export interface ConsumeResult {
  state: QuotaState;
  allowed: boolean;
  remaining: number;
}

export function consumeQuota(state: QuotaState, type: QuotaType, amount: number): ConsumeResult {
  const limit = state.limits.find(l => l.type === type);
  if (!limit) return { state, allowed: false, remaining: 0 };
  if (limit.used + amount > limit.limit) {
    return {
      state: { ...state, violations: [...state.violations, { type, timestamp: Date.now(), attempted: amount }].slice(-100) },
      allowed: false,
      remaining: Math.max(0, limit.limit - limit.used),
    };
  }
  const newLimits = state.limits.map(l => l.type === type ? { ...l, used: l.used + amount } : l);
  const updated = newLimits.find(l => l.type === type)!;
  return { state: { ...state, limits: newLimits }, allowed: true, remaining: updated.limit - updated.used };
}

export function setLimit(state: QuotaState, type: QuotaType, limit: number): QuotaState {
  return { ...state, limits: state.limits.map(l => l.type === type ? { ...l, limit } : l) };
}

export function resetQuota(state: QuotaState, type: QuotaType): QuotaState {
  return {
    ...state,
    limits: state.limits.map(l => l.type === type ? { ...l, used: 0, windowStart: Date.now() } : l),
    resets: [...state.resets, { type, timestamp: Date.now() }].slice(-100),
  };
}

export function getRemaining(state: QuotaState, type: QuotaType): number {
  const limit = state.limits.find(l => l.type === type);
  return limit ? Math.max(0, limit.limit - limit.used) : 0;
}

export function getUsagePercent(state: QuotaState, type: QuotaType): number {
  const limit = state.limits.find(l => l.type === type);
  if (!limit || limit.limit === 0) return 0;
  return (limit.used / limit.limit) * 100;
}

export function getQuotaReport(state: QuotaState): { type: QuotaType; used: number; limit: number; percent: number; remaining: number }[] {
  return state.limits.map(l => ({
    type: l.type,
    used: l.used,
    limit: l.limit,
    percent: (l.used / l.limit) * 100,
    remaining: Math.max(0, l.limit - l.used),
  }));
}

export function clearQuota(): QuotaState {
  return createQuotaState();
}
