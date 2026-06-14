/**
 * V221 PresenceTracker - Direction C Doc Federation (Iter 7/30)
 * thunderbolt: Track user presence (online/away/offline) on documents
 */
export type PresenceStatus = 'online' | 'away' | 'offline' | 'editing' | 'viewing';

export interface Presence {
  userId: string;
  deviceId: string;
  docId: string;
  status: PresenceStatus;
  lastSeen: number;
  joinedAt: number;
}

export interface PresenceState {
  presences: Map<string, Presence>;  // key = userId:deviceId:docId
  lastBroadcast: number;
  totalJoins: number;
  totalLeaves: number;
}

export function createPresenceState(): PresenceState {
  return { presences: new Map(), lastBroadcast: 0, totalJoins: 0, totalLeaves: 0 };
}

export function joinDoc(state: PresenceState, userId: string, deviceId: string, docId: string, status: PresenceStatus = 'online'): PresenceState {
  const key = `${userId}:${deviceId}:${docId}`;
  const presence: Presence = { userId, deviceId, docId, status, lastSeen: Date.now(), joinedAt: Date.now() };
  return { ...state, presences: new Map(state.presences).set(key, presence), lastBroadcast: Date.now(), totalJoins: state.totalJoins + 1 };
}

export function leaveDoc(state: PresenceState, userId: string, deviceId: string, docId: string): PresenceState {
  const key = `${userId}:${deviceId}:${docId}`;
  const presences = new Map(state.presences);
  presences.delete(key);
  return { ...state, presences, lastBroadcast: Date.now(), totalLeaves: state.totalLeaves + 1 };
}

export function updatePresenceStatus(state: PresenceState, userId: string, deviceId: string, docId: string, status: PresenceStatus): PresenceState {
  const key = `${userId}:${deviceId}:${docId}`;
  const p = state.presences.get(key);
  if (!p) return state;
  return { ...state, presences: new Map(state.presences).set(key, { ...p, status, lastSeen: Date.now() }) };
}

export function heartbeat(state: PresenceState, userId: string, deviceId: string, docId: string): PresenceState {
  const key = `${userId}:${deviceId}:${docId}`;
  const p = state.presences.get(key);
  if (!p) return state;
  return { ...state, presences: new Map(state.presences).set(key, { ...p, lastSeen: Date.now() }) };
}

export function getPresencesInDoc(state: PresenceState, docId: string): Presence[] {
  return Array.from(state.presences.values()).filter(p => p.docId === docId);
}

export function getPresencesForUser(state: PresenceState, userId: string): Presence[] {
  return Array.from(state.presences.values()).filter(p => p.userId === userId);
}

export function getActivePresenceCount(state: PresenceState, docId: string): number {
  return getPresencesInDoc(state, docId).filter(p => p.status === 'online' || p.status === 'editing' || p.status === 'viewing').length;
}

export function getPresenceReport(state: PresenceState): { total: number; byDoc: Record<string, number>; byStatus: Record<string, number>; joins: number; leaves: number } {
  const byDoc: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const p of state.presences.values()) {
    byDoc[p.docId] = (byDoc[p.docId] || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }
  return { total: state.presences.size, byDoc, byStatus, joins: state.totalJoins, leaves: state.totalLeaves };
}
