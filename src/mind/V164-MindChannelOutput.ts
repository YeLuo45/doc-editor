/**
 * V164 MindChannelOutput - Direction A Writing Mind (Iter 10/30)
 * nanobot: output channel (suggestions/publish emission)
 */
export type OutputType = 'suggestion' | 'warning' | 'insight' | 'publish' | 'notification';

export type OutputPriority = 'low' | 'normal' | 'high' | 'critical';

export interface OutputMessage {
  id: string;
  type: OutputType;
  priority: OutputPriority;
  content: string;
  target: string;
  timestamp: number;
  delivered: boolean;
}

export interface OutputChannel {
  pending: OutputMessage[];
  delivered: OutputMessage[];
  suppressed: number;
}

let counter = 0;
function nextId(): string { return `out-${++counter}-${Date.now()}`; }

export function createOutputChannel(): OutputChannel {
  return { pending: [], delivered: [], suppressed: 0 };
}

export function enqueue(channel: OutputChannel, type: OutputType, priority: OutputPriority, content: string, target: string): OutputChannel {
  const msg: OutputMessage = { id: nextId(), type, priority, content, target, timestamp: Date.now(), delivered: false };
  const pending = [...channel.pending, msg];
  // Sort by priority
  const order: OutputPriority[] = ['critical', 'high', 'normal', 'low'];
  pending.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
  return { ...channel, pending };
}

export function deliver(channel: OutputChannel, maxItems: number = 10): OutputChannel {
  const toDeliver = channel.pending.slice(0, maxItems);
  const remaining = channel.pending.slice(maxItems);
  const deliveredMsgs = toDeliver.map(m => ({ ...m, delivered: true }));
  return { ...channel, pending: remaining, delivered: [...channel.delivered, ...deliveredMsgs].slice(-200) };
}

export function getLastDelivered(channel: OutputChannel, count: number = 10): OutputMessage[] {
  return channel.delivered.slice(-count);
}

export function suppress(channel: OutputChannel, count: number = 1): OutputChannel {
  return { ...channel, suppressed: channel.suppressed + count };
}

export function getPendingByType(channel: OutputChannel, type: OutputType): OutputMessage[] {
  return channel.pending.filter(m => m.type === type);
}

export function getPendingByPriority(channel: OutputChannel, priority: OutputPriority): OutputMessage[] {
  return channel.pending.filter(m => m.priority === priority);
}

export function getOutputReport(channel: OutputChannel): { pending: number; delivered: number; suppressed: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const m of channel.delivered) byType[m.type] = (byType[m.type] || 0) + 1;
  return { pending: channel.pending.length, delivered: channel.delivered.length, suppressed: channel.suppressed, byType };
}

export function clearOutput(channel: OutputChannel): OutputChannel {
  return createOutputChannel();
}
