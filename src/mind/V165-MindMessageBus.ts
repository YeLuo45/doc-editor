/**
 * V165 MindMessageBus - Direction A Writing Mind (Iter 11/30)
 * nanobot: cross-mind async pub/sub communication
 */
export interface MindMessage {
  topic: string;
  payload: any;
  sender: string;
  timestamp: number;
}

export interface MindSubscription {
  id: string;
  topic: string;
  callback: (msg: MindMessage) => void;
  createdAt: number;
}

export interface MindBusState {
  messages: MindMessage[];
  subscriptions: MindSubscription[];
  nextId: number;
  totalPublished: number;
  totalDelivered: number;
}

let counter = 0;
function nextId(): string { return `sub-${++counter}`; }

export function createMindBus(): MindBusState {
  return { messages: [], subscriptions: [], nextId: 1, totalPublished: 0, totalDelivered: 0 };
}

export function publish(state: MindBusState, topic: string, payload: any, sender: string = 'unknown'): MindBusState {
  const msg: MindMessage = { topic, payload, sender, timestamp: Date.now() };
  const matchingSubs = state.subscriptions.filter(s => s.topic === topic || s.topic === '*');
  return {
    ...state,
    messages: [...state.messages, msg].slice(-500),
    totalPublished: state.totalPublished + 1,
    totalDelivered: state.totalDelivered + matchingSubs.length,
  };
}

export function subscribe(state: MindBusState, topic: string, callback: (msg: MindMessage) => void): { state: MindBusState; id: string } {
  const id = nextId();
  const sub: MindSubscription = { id, topic, callback, createdAt: Date.now() };
  return { state: { ...state, subscriptions: [...state.subscriptions, sub] }, id };
}

export function unsubscribe(state: MindBusState, id: string): MindBusState {
  return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== id) };
}

export function getMessages(state: MindBusState, topic?: string, count: number = 10): MindMessage[] {
  const filtered = topic ? state.messages.filter(m => m.topic === topic) : state.messages;
  return filtered.slice(-count);
}

export function getSubscriptionsByTopic(state: MindBusState, topic: string): MindSubscription[] {
  return state.subscriptions.filter(s => s.topic === topic);
}

export function getBusReport(state: MindBusState): { published: number; delivered: number; subscriptions: number; topics: string[] } {
  const topics = Array.from(new Set(state.messages.map(m => m.topic)));
  return { published: state.totalPublished, delivered: state.totalDelivered, subscriptions: state.subscriptions.length, topics };
}

export function clearBus(state: MindBusState): MindBusState {
  return createMindBus();
}
