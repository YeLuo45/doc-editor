/**
 * V260 PerfLifecycle - Direction D Perf Compression (Iter 16/30)
 * ruflo: Performance session lifecycle (init/measure/optimize)
 */
export type PerfPhase = 'init' | 'measuring' | 'analyzing' | 'optimizing' | 'idle' | 'error';

export interface PerfSession {
  id: string;
  phase: PerfPhase;
  startedAt: number;
  endedAt?: number;
  measurements: number;
  optimizations: number;
}

export interface PerfLifecycleState {
  sessions: Map<string, PerfSession>;
  activeId: string | null;
  nextId: number;
  totalSessions: number;
  totalMeasurements: number;
}

export function createPerfLifecycleState(): PerfLifecycleState {
  return { sessions: new Map(), activeId: null, nextId: 1, totalSessions: 0, totalMeasurements: 0 };
}

export function startSession(state: PerfLifecycleState): { state: PerfLifecycleState; sessionId: string } {
  const id = `psess-${state.nextId}`;
  const session: PerfSession = { id, phase: 'init', startedAt: Date.now(), measurements: 0, optimizations: 0 };
  return { state: { ...state, sessions: new Map(state.sessions).set(id, session), activeId: id, nextId: state.nextId + 1, totalSessions: state.totalSessions + 1 }, sessionId: id };
}

export function transitionPhase(state: PerfLifecycleState, sessionId: string, phase: PerfPhase): PerfLifecycleState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, phase }) };
}

export function recordMeasurement(state: PerfLifecycleState, sessionId: string): PerfLifecycleState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, measurements: session.measurements + 1 }), totalMeasurements: state.totalMeasurements + 1 };
}

export function recordOptimization(state: PerfLifecycleState, sessionId: string): PerfLifecycleState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, optimizations: session.optimizations + 1 }) };
}

export function endSession(state: PerfLifecycleState, sessionId: string): PerfLifecycleState {
  const session = state.sessions.get(sessionId);
  if (!session) return state;
  return { ...state, sessions: new Map(state.sessions).set(sessionId, { ...session, phase: 'idle', endedAt: Date.now() }), activeId: state.activeId === sessionId ? null : state.activeId };
}

export function getSession(state: PerfLifecycleState, sessionId: string): PerfSession | undefined {
  return state.sessions.get(sessionId);
}

export function getActiveSession(state: PerfLifecycleState): PerfSession | undefined {
  return state.activeId ? state.sessions.get(state.activeId) : undefined;
}

export function getSessionsByPhase(state: PerfLifecycleState, phase: PerfPhase): PerfSession[] {
  return Array.from(state.sessions.values()).filter(s => s.phase === phase);
}

export function getPerfLifecycleReport(state: PerfLifecycleState): { total: number; totalMeasurements: number; activeId: string | null } {
  return { total: state.totalSessions, totalMeasurements: state.totalMeasurements, activeId: state.activeId };
}
