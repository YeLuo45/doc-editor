/**
 * V203 AgentAuditChain - Direction B Agent Forge (Iter 19/30)
 * ruflo: Audit all agent operations (input/output/decision)
 */
export type AuditAction = 'invoke' | 'register' | 'unregister' | 'update' | 'distribute' | 'rollback';

export interface AuditEntry {
  id: number;
  agentId: string;
  action: AuditAction;
  timestamp: number;
  input: any;
  output: any;
  decision: string;
  prevHash: string;
  hash: string;
}

export interface AuditChainState {
  entries: AuditEntry[];
  nextId: number;
  lastHash: string;
}

function hashEntry(entry: Omit<AuditEntry, 'hash'>): string {
  const s = JSON.stringify({ id: entry.id, agentId: entry.agentId, action: entry.action, timestamp: entry.timestamp, decision: entry.decision, prevHash: entry.prevHash });
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return `h${Math.abs(h).toString(16)}`;
}

export function createAuditChainState(): AuditChainState {
  return { entries: [], nextId: 1, lastHash: '0' };
}

export function appendAudit(state: AuditChainState, agentId: string, action: AuditAction, input: any, output: any, decision: string): AuditChainState {
  const id = state.nextId;
  const timestamp = Date.now();
  const entry: Omit<AuditEntry, 'hash'> = { id, agentId, action, timestamp, input, output, decision, prevHash: state.lastHash };
  const hash = hashEntry(entry);
  const fullEntry: AuditEntry = { ...entry, hash };
  return { ...state, entries: [...state.entries, fullEntry].slice(-1000), nextId: state.nextId + 1, lastHash: hash };
}

export function verifyChain(state: AuditChainState): boolean {
  let prev = '0';
  for (const entry of state.entries) {
    if (entry.prevHash !== prev) return false;
    const expected = hashEntry({ id: entry.id, agentId: entry.agentId, action: entry.action, timestamp: entry.timestamp, input: entry.input, output: entry.output, decision: entry.decision, prevHash: entry.prevHash });
    if (entry.hash !== expected) return false;
    prev = entry.hash;
  }
  return true;
}

export function getAuditByAction(state: AuditChainState, action: AuditAction): AuditEntry[] {
  return state.entries.filter(e => e.action === action);
}

export function getAuditByAgent(state: AuditChainState, agentId: string): AuditEntry[] {
  return state.entries.filter(e => e.agentId === agentId);
}

export function getRecentAudits(state: AuditChainState, count: number = 10): AuditEntry[] {
  return state.entries.slice(-count);
}

export function clearAuditChain(state: AuditChainState): AuditChainState {
  return createAuditChainState();
}

export function getAuditChainReport(state: AuditChainState): { total: number; chainValid: boolean; byAction: Record<string, number> } {
  const byAction: Record<string, number> = {};
  for (const e of state.entries) byAction[e.action] = (byAction[e.action] || 0) + 1;
  return { total: state.entries.length, chainValid: verifyChain(state), byAction };
}
