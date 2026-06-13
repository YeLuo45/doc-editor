/**
 * V173 MindAuditTrail - Direction A Writing Mind (Iter 19/30)
 * ruflo: audit all AI suggestions (input/output/decision chain)
 */
export type AuditAction = 'suggest' | 'apply' | 'reject' | 'modify' | 'undo' | 'auto';

export interface AuditEntry {
  id: number;
  timestamp: number;
  action: AuditAction;
  input: any;
  output: any;
  agentId: string;
  reason?: string;
  approved: boolean;
}

export interface AuditState {
  entries: AuditEntry[];
  nextId: number;
  totalApplied: number;
  totalRejected: number;
  totalModified: number;
}

export function createAuditTrail(): AuditState {
  return { entries: [], nextId: 1, totalApplied: 0, totalRejected: 0, totalModified: 0 };
}

export function recordAudit(state: AuditState, action: AuditAction, input: any, output: any, agentId: string, reason?: string, approved: boolean = false): AuditState {
  const entry: AuditEntry = { id: state.nextId, timestamp: Date.now(), action, input, output, agentId, reason, approved };
  let next = { ...state, entries: [...state.entries, entry].slice(-500), nextId: state.nextId + 1 };
  if (action === 'apply') next = { ...next, totalApplied: next.totalApplied + 1 };
  else if (action === 'reject') next = { ...next, totalRejected: next.totalRejected + 1 };
  else if (action === 'modify') next = { ...next, totalModified: next.totalModified + 1 };
  return next;
}

export function approveAudit(state: AuditState, id: number): AuditState {
  const entries = state.entries.map(e => e.id === id ? { ...e, approved: true } : e);
  return { ...state, entries };
}

export function getAuditByAction(state: AuditState, action: AuditAction): AuditEntry[] {
  return state.entries.filter(e => e.action === action);
}

export function getAuditByAgent(state: AuditState, agentId: string): AuditEntry[] {
  return state.entries.filter(e => e.agentId === agentId);
}

export function getRecentAudits(state: AuditState, count: number = 10): AuditEntry[] {
  return state.entries.slice(-count);
}

export function searchAuditByReason(state: AuditState, keyword: string): AuditEntry[] {
  return state.entries.filter(e => e.reason && e.reason.includes(keyword));
}

export function clearAudit(): AuditState {
  return createAuditTrail();
}

export function getAuditReport(state: AuditState): { total: number; applied: number; rejected: number; modified: number; approvalRate: number } {
  const total = state.entries.length;
  const approved = state.entries.filter(e => e.approved).length;
  return {
    total,
    applied: state.totalApplied,
    rejected: state.totalRejected,
    modified: state.totalModified,
    approvalRate: total > 0 ? approved / total : 0,
  };
}
