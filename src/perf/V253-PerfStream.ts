/**
 * V253 PerfStream - Direction D Perf Compression (Iter 9/30)
 * nanobot: Stream performance events through async channels
 */
export interface PerfStreamEvent {
  id: number;
  topic: string;
  data: any;
  timestamp: number;
}

export interface PerfStreamSubscription {
  id: string;
  topic: string;
  callback: (event: PerfStreamEvent) => void;
}

export interface PerfStreamState {
  events: PerfStreamEvent[];
  subscriptions: PerfStreamSubscription[];
  nextId: number;
  totalPublished: number;
  totalDelivered: number;
}

let counter = 0;
function nextId(): string { return `sub-${++counter}`; }

export function createPerfStreamState(): PerfStreamState {
  return { events: [], subscriptions: [], nextId: 1, totalPublished: 0, totalDelivered: 0 };
}

export function publishPerfEvent(state: PerfStreamState, topic: string, data: any): PerfStreamState {
  const event: PerfStreamEvent = { id: state.nextId, topic, data, timestamp: Date.now() };
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

export function subscribePerf(state: PerfStreamState, topic: string, callback: (event: PerfStreamEvent) => void): { state: PerfStreamState; subId: string } {
  const subId = nextId();
  const sub: PerfStreamSubscription = { id: subId, topic, callback };
  return { state: { ...state, subscriptions: [...state.subscriptions, sub] }, subId };
}

export function unsubscribePerf(state: PerfStreamState, subId: string): PerfStreamState {
  return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== subId) };
}

export function getEventsByTopic(state: PerfStreamState, topic: string): PerfStreamEvent[] {
  return state.events.filter(e => e.topic === topic);
}

export function getSubscriptionsForTopic(state: PerfStreamState, topic: string): PerfStreamSubscription[] {
  return state.subscriptions.filter(s => s.topic === topic || s.topic === '*');
}

export function clearPerfStream(state: PerfStreamState): PerfStreamState {
  return { ...state, events: [] };
}

export function getPerfStreamReport(state: PerfStreamState): { published: number; delivered: number; subscriptions: number; topics: number } {
  const topics = new Set(state.events.map(e => e.topic));
  return { published: state.totalPublished, delivered: state.totalDelivered, subscriptions: state.subscriptions.length, topics: topics.size };
}
