/**
 * V234 SyncQuota - Direction C Doc Federation (Iter 20/30)
 * ruflo: Bandwidth/operation/quota tracking
 */
export type QuotaType = 'bandwidth_in' | 'bandwidth_out' | 'operations' | 'messages' | 'storage';

export interface QuotaLimit {
  type: QuotaType;
  limit: number;
  used: number;
  windowStart: number;
}

export interface SyncQuotaState {
  limits: QuotaLimit[];
  violations: Array<{ type: QuotaType; timestamp: number; attempted: number; limit: number }>;
}

export function createSyncQuotaState(): SyncQuotaState {
  const now = Date.now();
  return {
    limits: [
      { type: 'bandwidth_in', limit: 100 * 1024 * 1024, used: 0, windowStart: now },
      { type: 'bandwidth_out', limit: 100 * 1024 * 1024, used: 0, windowStart: now },
      { type: 'operations', limit: 10000, used: 0, windowStart: now },
      { type: 'messages', limit: 50000, used: 0, windowStart: now },
      { type: 'storage', limit: 1024 * 1024 * 1024, used: 0, windowStart: now },
    ],
    violations: [],
  };
}

export function consumeSyncQuota(state: SyncQuotaState, type: QuotaType, amount: number): { state: SyncQuotaState; allowed: boolean; remaining: number } {
  const limit = state.limits.find(l => l.type === type);
  if (!limit) return { state, allowed: false, remaining: 0 };
  if (limit.used + amount > limit.limit) {
    return {
      state: { ...state, violations: [...state.violations, { type, timestamp: Date.now(), attempted: amount, limit: limit.limit }].slice(-100) },
      allowed: false,
      remaining: Math.max(0, limit.limit - limit.used),
    };
  }
  const newLimits = state.limits.map(l => l.type === type ? { ...l, used: l.used + amount } : l);
  const updated = newLimits.find(l => l.type === type)!;
  return { state: { ...state, limits: newLimits }, allowed: true, remaining: updated.limit - updated.used };
}

export function setSyncQuotaLimit(state: SyncQuotaState, type: QuotaType, limit: number): SyncQuotaState {
  return { ...state, limits: state.limits.map(l => l.type === type ? { ...l, limit } : l) };
}

export function resetSyncQuota(state: SyncQuotaState, type: QuotaType): SyncQuotaState {
  return { ...state, limits: state.limits.map(l => l.type === type ? { ...l, used: 0, windowStart: Date.now() } : l) };
}

export function getSyncQuotaRemaining(state: SyncQuotaState, type: QuotaType): number {
  const limit = state.limits.find(l => l.type === type);
  return limit ? Math.max(0, limit.limit - limit.used) : 0;
}

export function getSyncQuotaUsagePercent(state: SyncQuotaState, type: QuotaType): number {
  const limit = state.limits.find(l => l.type === type);
  if (!limit || limit.limit === 0) return 0;
  return (limit.used / limit.limit) * 100;
}

export function getSyncQuotaReport(state: SyncQuotaState): { type: QuotaType; used: number; limit: number; percent: number; remaining: number }[] {
  return state.limits.map(l => ({
    type: l.type,
    used: l.used,
    limit: l.limit,
    percent: (l.used / l.limit) * 100,
    remaining: Math.max(0, l.limit - l.used),
  }));
}
