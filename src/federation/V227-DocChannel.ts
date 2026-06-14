/**
 * V227 DocChannel - Direction C Doc Federation (Iter 13/30)
 * nanobot: Per-document channel abstraction
 */
export type ChannelState = 'open' | 'closed' | 'paused' | 'overflow';

export interface DocChannelInfo {
  docId: string;
  state: ChannelState;
  subscriberCount: number;
  messageCount: number;
  createdAt: number;
  lastActivityAt: number;
  bufferSize: number;
}

export interface DocChannelState {
  channels: Map<string, DocChannelInfo>;
  nextId: number;
  totalMessages: number;
}

export function createDocChannelState(): DocChannelState {
  return { channels: new Map(), nextId: 1, totalMessages: 0 };
}

export function openChannel(state: DocChannelState, docId: string): DocChannelState {
  const existing = state.channels.get(docId);
  if (existing) {
    return { ...state, channels: new Map(state.channels).set(docId, { ...existing, state: 'open' }) };
  }
  const channel: DocChannelInfo = { docId, state: 'open', subscriberCount: 0, messageCount: 0, createdAt: Date.now(), lastActivityAt: Date.now(), bufferSize: 0 };
  return { ...state, channels: new Map(state.channels).set(docId, channel), nextId: state.nextId + 1 };
}

export function closeChannel(state: DocChannelState, docId: string): DocChannelState {
  const c = state.channels.get(docId);
  if (!c) return state;
  return { ...state, channels: new Map(state.channels).set(docId, { ...c, state: 'closed' }) };
}

export function pauseChannel(state: DocChannelState, docId: string): DocChannelState {
  const c = state.channels.get(docId);
  if (!c) return state;
  return { ...state, channels: new Map(state.channels).set(docId, { ...c, state: 'paused' }) };
}

export function subscribeChannel(state: DocChannelState, docId: string): DocChannelState {
  const c = state.channels.get(docId);
  if (!c) return state;
  return { ...state, channels: new Map(state.channels).set(docId, { ...c, subscriberCount: c.subscriberCount + 1, lastActivityAt: Date.now() }) };
}

export function unsubscribeChannel(state: DocChannelState, docId: string): DocChannelState {
  const c = state.channels.get(docId);
  if (!c) return state;
  return { ...state, channels: new Map(state.channels).set(docId, { ...c, subscriberCount: Math.max(0, c.subscriberCount - 1) }) };
}

export function pushMessage(state: DocChannelState, docId: string, count: number = 1): DocChannelState {
  const c = state.channels.get(docId);
  if (!c) return state;
  const newBuffer = c.bufferSize + count;
  const newState: ChannelState = newBuffer > 1000 ? 'overflow' : c.state;
  return {
    ...state,
    channels: new Map(state.channels).set(docId, { ...c, messageCount: c.messageCount + count, bufferSize: newBuffer, lastActivityAt: Date.now(), state: newState }),
    totalMessages: state.totalMessages + count,
  };
}

export function flushBuffer(state: DocChannelState, docId: string): DocChannelState {
  const c = state.channels.get(docId);
  if (!c) return state;
  return { ...state, channels: new Map(state.channels).set(docId, { ...c, bufferSize: 0, state: c.state === 'overflow' ? 'open' : c.state }) };
}

export function getChannel(state: DocChannelState, docId: string): DocChannelInfo | undefined {
  return state.channels.get(docId);
}

export function getChannelsByState(state: DocChannelState, chState: ChannelState): DocChannelInfo[] {
  return Array.from(state.channels.values()).filter(c => c.state === chState);
}

export function getDocChannelReport(state: DocChannelState): { total: number; byState: Record<string, number>; totalMessages: number } {
  const byState: Record<string, number> = {};
  for (const c of state.channels.values()) byState[c.state] = (byState[c.state] || 0) + 1;
  return { total: state.channels.size, byState, totalMessages: state.totalMessages };
}
