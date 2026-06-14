/**
 * V292 TrustQuota - Direction E Trust Verification (Iter 18/30)
 * ruflo: Rate limit trust verifications
 */
export type TrustOp = 'verify' | 'issue' | 'revoke' | 'audit_lookup';

export interface TrustQuotaConfig {
  op: TrustOp;
  limit: number;
  windowMs: number;
}

export interface TrustQuotaUsage {
  op: TrustOp;
  count: number;
  windowStart: number;
  blocked: number;
}

export interface TrustQuotaState {
  configs: Map<TrustOp, TrustQuotaConfig>;
  usage: Map<TrustOp, TrustQuotaUsage>;
  totalAllowed: number;
  totalBlocked: number;
}

export function createTrustQuotaState(): TrustQuotaState {
  return { configs: new Map(), usage: new Map(), totalAllowed: 0, totalBlocked: 0 };
}

export function setTrustQuota(state: TrustQuotaState, config: TrustQuotaConfig): TrustQuotaState {
  return { ...state, configs: new Map(state.configs).set(config.op, config), usage: new Map(state.usage).set(config.op, { op: config.op, count: 0, windowStart: Date.now(), blocked: 0 }) };
}

export function checkTrustQuota(state: TrustQuotaState, op: TrustOp): { state: TrustQuotaState; allowed: boolean; remaining: number } {
  const config = state.configs.get(op);
  const u = state.usage.get(op);
  if (!config || !u) return { state, allowed: true, remaining: Infinity };
  const now = Date.now();
  let count = u.count;
  let windowStart = u.windowStart;
  if (config.windowMs > 0 && now - windowStart >= config.windowMs) {
    count = 0;
    windowStart = now;
  }
  if (count >= config.limit) {
    return { state: { ...state, usage: new Map(state.usage).set(op, { ...u, blocked: u.blocked + 1 }), totalBlocked: state.totalBlocked + 1 }, allowed: false, remaining: 0 };
  }
  return { state: { ...state, usage: new Map(state.usage).set(op, { op, count: count + 1, windowStart, blocked: u.blocked }), totalAllowed: state.totalAllowed + 1 }, allowed: true, remaining: config.limit - count - 1 };
}

export function resetTrustQuota(state: TrustQuotaState, op: TrustOp): TrustQuotaState {
  const u = state.usage.get(op);
  if (!u) return state;
  return { ...state, usage: new Map(state.usage).set(op, { ...u, count: 0, windowStart: Date.now() }) };
}

export function getTrustQuotaUsage(state: TrustQuotaState, op: TrustOp): TrustQuotaUsage | undefined {
  return state.usage.get(op);
}

export function getTrustQuotaReport(state: TrustQuotaState): { configured: number; totalAllowed: number; totalBlocked: number; byOp: Record<string, { count: number; blocked: number }> } {
  const byOp: Record<string, { count: number; blocked: number }> = {};
  for (const [op, u] of state.usage.entries()) byOp[op] = { count: u.count, blocked: u.blocked };
  return { configured: state.configs.size, totalAllowed: state.totalAllowed, totalBlocked: state.totalBlocked, byOp };
}
