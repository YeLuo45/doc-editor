/**
 * V290 TrustLifecycle - Direction E Trust Verification (Iter 16/30)
 * ruflo: Trust session lifecycle (issue/verify/revoke/expire)
 */
export type TrustPhase = 'init' | 'issued' | 'verified' | 'revoked' | 'expired' | 'renewed';

export interface TrustSession {
  id: string;
  docId: string;
  phase: TrustPhase;
  issuedAt: number;
  expiresAt: number;
  issuerId: string;
  history: { phase: TrustPhase; timestamp: number }[];
}

export interface TrustLifecycleState {
  sessions: Map<string, TrustSession>;
  nextId: number;
  totalSessions: number;
  totalRevoked: number;
  totalExpired: number;
}

export function createTrustLifecycleState(): TrustLifecycleState {
  return { sessions: new Map(), nextId: 1, totalSessions: 0, totalRevoked: 0, totalExpired: 0 };
}

export function issueTrustSession(state: TrustLifecycleState, docId: string, issuerId: string, ttlMs: number = 86400000): { state: TrustLifecycleState; sessionId: string } {
  const id = `tsess-${state.nextId}`;
  const now = Date.now();
  const session: TrustSession = { id, docId, phase: 'issued', issuedAt: now, expiresAt: now + ttlMs, issuerId, history: [{ phase: 'init', timestamp: now }, { phase: 'issued', timestamp: now }] };
  return { state: { ...state, sessions: new Map(state.sessions).set(id, session), nextId: state.nextId + 1, totalSessions: state.totalSessions + 1 }, sessionId: id };
}

export function verifyTrustSession(state: TrustLifecycleState, sessionId: string): { state: TrustLifecycleState; valid: boolean; reason?: string } {
  const session = state.sessions.get(sessionId);
  if (!session) return { state, valid: false, reason: 'not_found' };
  const now = Date.now();
  if (session.phase === 'revoked') return { state, valid: false, reason: 'revoked' };
  if (now >= session.expiresAt) {
    const updated: TrustSession = { ...session, phase: 'expired', history: [...session.history, { phase: 'expired', timestamp: now }] };
    return { state: { ...state, sessions: new Map(state.sessions).set(sessionId, updated), totalExpired: state.totalExpired + 1 }, valid: false, reason: 'expired' };
  }
  const updated: TrustSession = { ...session, phase: 'verified', history: [...session.history, { phase: 'verified', timestamp: now }] };
  return { state: { ...state, sessions: new Map(state.sessions).set(sessionId, updated) }, valid: true };
}

export function revokeTrustSession(state: TrustLifecycleState, sessionId: string): TrustLifecycleState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, phase: 'revoked', history: [...session.history, { phase: 'revoked', timestamp: Date.now() }] }), totalRevoked: state.totalRevoked + 1 };
}

export function renewTrustSession(state: TrustLifecycleState, sessionId: string, ttlMs: number = 86400000): TrustLifecycleState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, phase: 'renewed', expiresAt: Date.now() + ttlMs, history: [...session.history, { phase: 'renewed', timestamp: Date.now() }] }) };
}

export function getSession(state: TrustLifecycleState, sessionId: string): TrustSession | undefined {
  return state.sessions.get(sessionId);
}

export function getSessionsForDoc(state: TrustLifecycleState, docId: string): TrustSession[] {
  return Array.from(state.sessions.values()).filter(s => s.docId === docId);
}

export function getExpiredSessions(state: TrustLifecycleState): TrustSession[] {
  const now = Date.now();
  return Array.from(state.sessions.values()).filter(s => now >= s.expiresAt);
}

export function clearTrustLifecycle(state: TrustLifecycleState): TrustLifecycleState {
  return createTrustLifecycleState();
}

export function getTrustLifecycleReport(state: TrustLifecycleState): { total: number; revoked: number; expired: number; byPhase: Record<string, number> } {
  const byPhase: Record<string, number> = {};
  for (const s of state.sessions.values()) byPhase[s.phase] = (byPhase[s.phase] || 0) + 1;
  return { total: state.totalSessions, revoked: state.totalRevoked, expired: state.totalExpired, byPhase };
}
