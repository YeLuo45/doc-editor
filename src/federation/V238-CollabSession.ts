/**
 * V238 CollabSession - Direction C Doc Federation (Iter 24/30)
 * chatdev: Collaboration session management (start/join/leave)
 */
export interface CollabSession {
  id: string;
  docId: string;
  host: string;
  participants: Set<string>;
  createdAt: number;
  endedAt?: number;
  active: boolean;
}

export interface CollabSessionState {
  sessions: Map<string, CollabSession>;
  nextId: number;
  totalSessions: number;
  activeSessions: number;
}

export function createCollabSessionState(): CollabSessionState {
  return { sessions: new Map(), nextId: 1, totalSessions: 0, activeSessions: 0 };
}

export function startSession(state: CollabSessionState, docId: string, host: string): { state: CollabSessionState; sessionId: string } {
  const id = `sess-${state.nextId}`;
  const session: CollabSession = { id, docId, host, participants: new Set([host]), createdAt: Date.now(), active: true };
  return { state: { ...state, sessions: new Map(state.sessions).set(id, session), nextId: state.nextId + 1, totalSessions: state.totalSessions + 1, activeSessions: state.activeSessions + 1 }, sessionId: id };
}

export function joinSession(state: CollabSessionState, sessionId: string, userId: string): CollabSessionState {
  const session = state.sessions.get(sessionId);
  if (!session || !session.active) return state;
  const participants = new Set(session.participants);
  participants.add(userId);
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, participants }) };
}

export function leaveSession(state: CollabSessionState, sessionId: string, userId: string): CollabSessionState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  const participants = new Set(session.participants);
  participants.delete(userId);
  // End session if host leaves and no participants
  if (session.host === userId && participants.size === 0) {
    return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, participants, active: false, endedAt: Date.now() }), activeSessions: Math.max(0, state.activeSessions - 1) };
  }
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, participants }) };
}

export function endSession(state: CollabSessionState, sessionId: string): CollabSessionState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, active: false, endedAt: Date.now() }), activeSessions: Math.max(0, state.activeSessions - 1) };
}

export function getSession(state: CollabSessionState, sessionId: string): CollabSession | undefined {
  return state.sessions.get(sessionId);
}

export function getSessionsForDoc(state: CollabSessionState, docId: string): CollabSession[] {
  return Array.from(state.sessions.values()).filter(s => s.docId === docId);
}

export function getSessionsForUser(state: CollabSessionState, userId: string): CollabSession[] {
  return Array.from(state.sessions.values()).filter(s => s.participants.has(userId));
}

export function getActiveSessions(state: CollabSessionState): CollabSession[] {
  return Array.from(state.sessions.values()).filter(s => s.active);
}

export function getCollabSessionReport(state: CollabSessionState): { total: number; active: number; byDoc: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  for (const s of state.sessions.values()) byDoc[s.docId] = (byDoc[s.docId] || 0) + 1;
  return { total: state.totalSessions, active: state.activeSessions, byDoc };
}
