/**
 * V286 TrustBus - Direction E Trust Verification (Iter 12/30)
 * nanobot: Internal message bus for trust components
 */
export type BusMessageType = 'verify' | 'revoke' | 'audit' | 'score' | 'alert';

export interface BusMessage {
  id: number;
  type: BusMessageType;
  docId?: string;
  payload: any;
  senderId: string;
  timestamp: number;
  deliveredTo: string[];
}

export interface TrustBusState {
  messages: BusMessage[];
  subscribers: Map<string, ((msg: BusMessage) => void)[]>;
  nextId: number;
  totalSent: number;
  totalDelivered: number;
}

export function createTrustBusState(): TrustBusState {
  return { messages: [], subscribers: new Map(), nextId: 1, totalSent: 0, totalDelivered: 0 };
}

export function sendMessage(state: TrustBusState, type: BusMessageType, senderId: string, payload: any, docId?: string): TrustBusState {
  const msg: BusMessage = { id: state.nextId, type, docId, payload, senderId, timestamp: Date.now(), deliveredTo: [] };
  const subs = state.subscribers.get(type) || [];
  for (const cb of subs) {
    try { cb(msg); msg.deliveredTo.push(senderId); } catch {}
  }
  return { ...state, messages: [...state.messages, msg].slice(-1000), nextId: state.nextId + 1, totalSent: state.totalSent + 1, totalDelivered: state.totalDelivered + subs.length };
}

export function subscribeToBus(state: TrustBusState, type: BusMessageType, callback: (msg: BusMessage) => void): TrustBusState {
  const existing = state.subscribers.get(type) || [];
  return { ...state, subscribers: new Map(state.subscribers).set(type, [...existing, callback]) };
}

export function getMessagesByType(state: TrustBusState, type: BusMessageType): BusMessage[] {
  return state.messages.filter(m => m.type === type);
}

export function getMessagesForDoc(state: TrustBusState, docId: string): BusMessage[] {
  return state.messages.filter(m => m.docId === docId);
}

export function clearTrustBus(state: TrustBusState): TrustBusState {
  return { ...state, messages: [] };
}

export function getTrustBusReport(state: TrustBusState): { totalSent: number; totalDelivered: number; subscribers: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const m of state.messages) byType[m.type] = (byType[m.type] || 0) + 1;
  const subscribers = Array.from(state.subscribers.values()).reduce((a, b) => a + b.length, 0);
  return { totalSent: state.totalSent, totalDelivered: state.totalDelivered, subscribers, byType };
}
