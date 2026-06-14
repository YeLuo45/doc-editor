/**
 * V223 SyncBus - Direction C Doc Federation (Iter 9/30)
 * nanobot: Cross-document sync message bus with pub/sub
 */
export interface SyncMessage {
  id: string;
  topic: string;
  docId: string;
  payload: any;
  sender: string;
  timestamp: number;
}

export interface SyncSubscription {
  id: string;
  topic: string;
  subscriber: string;
  callback: (msg: SyncMessage) => void;
}

export interface SyncBusState {
  messages: SyncMessage[];
  subscriptions: SyncSubscription[];
  nextId: number;
  totalPublished: number;
  totalDelivered: number;
}

let counter = 0;
function nextId(): string { return `msg-${++counter}-${Date.now()}`; }

export function createSyncBusState(): SyncBusState {
  return { messages: [], subscriptions: [], nextId: 1, totalPublished: 0, totalDelivered: 0 };
}

export function publishSync(state: SyncBusState, topic: string, docId: string, payload: any, sender: string): { state: SyncBusState; messageId: string } {
  const id = nextId();
  const msg: SyncMessage = { id, topic, docId, payload, sender, timestamp: Date.now() };
  const subs = state.subscriptions.filter(s => s.topic === topic || s.topic === '*');
  // Apply callbacks
  for (const sub of subs) {
    try { sub.callback(msg); } catch {}
  }
  return {
    state: { ...state, messages: [...state.messages, msg].slice(-500), subscriptions: state.subscriptions, nextId: state.nextId + 1, totalPublished: state.totalPublished + 1, totalDelivered: state.totalDelivered + subs.length },
    messageId: id,
  };
}

export function subscribeSync(state: SyncBusState, topic: string, subscriber: string, callback: (msg: SyncMessage) => void): { state: SyncBusState; subId: string } {
  const subId = `sub-${state.nextId}`;
  const sub: SyncSubscription = { id: subId, topic, subscriber, callback };
  return { state: { ...state, subscriptions: [...state.subscriptions, sub], nextId: state.nextId + 1 }, subId };
}

export function unsubscribeSync(state: SyncBusState, subId: string): SyncBusState {
  return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== subId) };
}

export function getMessagesByTopic(state: SyncBusState, topic: string): SyncMessage[] {
  return state.messages.filter(m => m.topic === topic);
}

export function getMessagesByDoc(state: SyncBusState, docId: string): SyncMessage[] {
  return state.messages.filter(m => m.docId === docId);
}

export function getSubscriptionsByTopic(state: SyncBusState, topic: string): SyncSubscription[] {
  return state.subscriptions.filter(s => s.topic === topic);
}

export function clearBus(state: SyncBusState): SyncBusState {
  return { ...state, messages: [] };
}

export function getSyncBusReport(state: SyncBusState): { published: number; delivered: number; subscriptions: number; topics: number } {
  const topics = new Set(state.messages.map(m => m.topic));
  return { published: state.totalPublished, delivered: state.totalDelivered, subscriptions: state.subscriptions.length, topics: topics.size };
}
