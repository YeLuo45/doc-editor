/**
 * V294 TrustEvent - Direction E Trust Verification (Iter 20/30)
 * ruflo: Emit typed trust events
 */
export type TrustEventType = 'verified' | 'tampered' | 'expired' | 'revoked' | 'policy_changed' | 'recovered';

export interface TrustEvent {
  id: number;
  type: TrustEventType;
  docId: string;
  actorId?: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  metadata: Record<string, any>;
}

export interface TrustEventBusState {
  events: TrustEvent[];
  nextId: number;
  totalEvents: number;
  byType: Record<TrustEventType, number>;
}

export function createTrustEventBus(): TrustEventBusState {
  return { events: [], nextId: 1, totalEvents: 0, byType: { verified: 0, tampered: 0, expired: 0, revoked: 0, policy_changed: 0, recovered: 0 } };
}

export function emitTrustEvent(state: TrustEventBusState, type: TrustEventType, docId: string, severity: 'low' | 'medium' | 'high' = 'low', actorId?: string, metadata: Record<string, any> = {}): TrustEventBusState {
  const event: TrustEvent = { id: state.nextId, type, docId, actorId, severity, timestamp: Date.now(), metadata };
  return { ...state, events: [...state.events, event].slice(-500), nextId: state.nextId + 1, totalEvents: state.totalEvents + 1, byType: { ...state.byType, [type]: state.byType[type] + 1 } };
}

export function getEventsByType(state: TrustEventBusState, type: TrustEventType): TrustEvent[] {
  return state.events.filter(e => e.type === type);
}

export function getEventsForDoc(state: TrustEventBusState, docId: string): TrustEvent[] {
  return state.events.filter(e => e.docId === docId);
}

export function getHighSeverityEvents(state: TrustEventBusState): TrustEvent[] {
  return state.events.filter(e => e.severity === 'high');
}

export function getRecentEvents(state: TrustEventBusState, count: number = 10): TrustEvent[] {
  return state.events.slice(-count);
}

export function clearTrustEvents(state: TrustEventBusState): TrustEventBusState {
  return createTrustEventBus();
}

export function getTrustEventReport(state: TrustEventBusState): { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } {
  const bySeverity: Record<string, number> = {};
  for (const e of state.events) bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
  return { total: state.totalEvents, byType: state.byType, bySeverity };
}
