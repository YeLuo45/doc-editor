/**
 * V291 TrustAudit - Direction E Trust Verification (Iter 17/30)
 * ruflo: Audit all trust-critical operations
 */
export type AuditAction = 'issue' | 'verify' | 'revoke' | 'audit' | 'policy_change';

export interface TrustAuditEntry {
  id: number;
  timestamp: number;
  action: AuditAction;
  actorId: string;
  target: string;
  reason: string;
  metadata: Record<string, any>;
}

export interface TrustAuditState {
  entries: TrustAuditEntry[];
  nextId: number;
  totalEntries: number;
  byAction: Record<AuditAction, number>;
}

export function createTrustAuditState(): TrustAuditState {
  return { entries: [], nextId: 1, totalEntries: 0, byAction: { issue: 0, verify: 0, revoke: 0, audit: 0, policy_change: 0 } };
}

export function logAudit(state: TrustAuditState, action: AuditAction, actorId: string, target: string, reason: string, metadata: Record<string, any> = {}): TrustAuditState {
  const entry: TrustAuditEntry = { id: state.nextId, timestamp: Date.now(), action, actorId, target, reason, metadata };
  return { ...state, entries: [...state.entries, entry].slice(-2000), nextId: state.nextId + 1, totalEntries: state.totalEntries + 1, byAction: { ...state.byAction, [action]: state.byAction[action] + 1 } };
}

export function getAuditByAction(state: TrustAuditState, action: AuditAction): TrustAuditEntry[] {
  return state.entries.filter(e => e.action === action);
}

export function getAuditByActor(state: TrustAuditState, actorId: string): TrustAuditEntry[] {
  return state.entries.filter(e => e.actorId === actorId);
}

export function getAuditByTarget(state: TrustAuditState, target: string): TrustAuditEntry[] {
  return state.entries.filter(e => e.target === target);
}

export function getRecentAudits(state: TrustAuditState, count: number = 10): TrustAuditEntry[] {
  return state.entries.slice(-count);
}

export function searchAuditByReason(state: TrustAuditState, keyword: string): TrustAuditEntry[] {
  return state.entries.filter(e => e.reason.includes(keyword));
}

export function clearTrustAudits(state: TrustAuditState): TrustAuditState {
  return createTrustAuditState();
}

export function getTrustAuditReport(state: TrustAuditState): { total: number; byAction: Record<string, number>; byActor: Record<string, number> } {
  const byActor: Record<string, number> = {};
  for (const e of state.entries) byActor[e.actorId] = (byActor[e.actorId] || 0) + 1;
  return { total: state.totalEntries, byAction: state.byAction, byActor };
}
