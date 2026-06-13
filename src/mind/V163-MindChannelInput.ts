/**
 * V163 MindChannelInput - Direction A Writing Mind (Iter 9/30)
 * nanobot: input channel adapter (edits/voice/import event ingestion)
 */
export type InputEventType = 'edit' | 'voice' | 'import' | 'paste' | 'cursor' | 'selection';

export interface InputEvent {
  id: string;
  type: InputEventType;
  timestamp: number;
  source: string;
  payload: any;
}

export interface ChannelState {
  events: InputEvent[];
  subscribers: Set<string>;
  paused: boolean;
  totalReceived: number;
}

let counter = 0;
function nextId(): string { return `evt-${++counter}-${Date.now()}`; }

export function createChannelState(): ChannelState {
  return { events: [], subscribers: new Set(), paused: false, totalReceived: 0 };
}

export function ingestEvent(state: ChannelState, type: InputEventType, source: string, payload: any): ChannelState {
  if (state.paused) return state;
  const event: InputEvent = { id: nextId(), type, timestamp: Date.now(), source, payload };
  return {
    ...state,
    events: [...state.events, event].slice(-500),
    totalReceived: state.totalReceived + 1,
  };
}

export function subscribe(state: ChannelState, subscriberId: string): ChannelState {
  const subscribers = new Set(state.subscribers);
  subscribers.add(subscriberId);
  return { ...state, subscribers };
}

export function unsubscribe(state: ChannelState, subscriberId: string): ChannelState {
  const subscribers = new Set(state.subscribers);
  subscribers.delete(subscriberId);
  return { ...state, subscribers };
}

export function getRecentEvents(state: ChannelState, count: number = 10): InputEvent[] {
  return state.events.slice(-count);
}

export function filterEvents(state: ChannelState, type: InputEventType): InputEvent[] {
  return state.events.filter(e => e.type === type);
}

export function pauseChannel(state: ChannelState): ChannelState {
  return { ...state, paused: true };
}

export function resumeChannel(state: ChannelState): ChannelState {
  return { ...state, paused: false };
}

export function getChannelReport(state: ChannelState): { total: number; byType: Record<string, number>; subscribers: number; paused: boolean } {
  const byType: Record<string, number> = {};
  for (const e of state.events) byType[e.type] = (byType[e.type] || 0) + 1;
  return { total: state.totalReceived, byType, subscribers: state.subscribers.size, paused: state.paused };
}

export function clearChannel(state: ChannelState): ChannelState {
  return createChannelState();
}
