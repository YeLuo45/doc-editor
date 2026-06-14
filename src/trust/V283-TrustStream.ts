/**
 * V283 TrustStream - Direction E Trust Verification (Iter 9/30)
 * nanobot: Stream trust events through async channels
 */
export interface TrustStreamEvent {
  id: number;
  topic: string;
  data: any;
  timestamp: number;
}

export interface TrustSubscription {
  id: string;
  topic: string;
  callback: (event: TrustStreamEvent) => void;
}

export interface TrustStreamState {
  events: TrustStreamEvent[];
  subscriptions: TrustSubscription[];
  nextId: number;
  totalPublished: number;
  totalDelivered: number;
}

let counter = 0;
function nextSubId(): string { return `tsub-${++counter}`; }

export function createTrustStreamState(): TrustStreamState {
  return { events: [], subscriptions: [], nextId: 1, totalPublished: 0, totalDelivered: 0 };
}

export function publishTrustEvent(state: TrustStreamState, topic: string, data: any): TrustStreamState {
  const event: TrustStreamEvent = { id: state.nextId, topic, data, timestamp: Date.now() };
  const subs = state.subscriptions.filter(s => s.topic === topic || s.topic === '*');
  for (const sub of subs) {
    try { sub.callback(event); } catch {}
  }
  return {
    ...state,
    events: [...state.events, event].slice(-500),
    nextId: state.nextId + 1,
    totalPublished: state.totalPublished + 1,
    totalDelivered: state.totalDelivered + subs.length,
  };
}

export function subscribeTrust(state: TrustStreamState, topic: string, callback: (event: TrustStreamEvent) => void): { state: TrustStreamState; subId: string } {
  const subId = nextSubId();
  const sub: TrustSubscription = { id: subId, topic, callback };
  return { state: { ...state, subscriptions: [...state.subscriptions, sub] }, subId };
}

export function unsubscribeTrust(state: TrustStreamState, subId: string): TrustStreamState {
  return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== subId) };
}

export function getTrustEventsByTopic(state: TrustStreamState, topic: string): TrustStreamEvent[] {
  return state.events.filter(e => e.topic === topic);
}

export function getTrustSubscriptions(state: TrustStreamState): TrustSubscription[] {
  return state.subscriptions;
}

export function clearTrustStream(state: TrustStreamState): TrustStreamState {
  return { ...state, events: [] };
}

export function getTrustStreamReport(state: TrustStreamState): { published: number; delivered: number; subscriptions: number; topics: number } {
  const topics = new Set(state.events.map(e => e.topic));
  return { published: state.totalPublished, delivered: state.totalDelivered, subscriptions: state.subscriptions.length, topics: topics.size };
}
