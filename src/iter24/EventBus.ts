export type EventBusConfig = { async?: boolean };
export type EventBusSnapshot = { channels: number };
export type EventBusMetrics = { version: string };

export class EventBus {
  config: EventBusConfig;
  private channels: Map<string, unknown[]> = new Map();

  constructor(config: EventBusConfig = {}) { this.config = config; }

  subscribe(channel: string): void { if (!this.channels.has(channel)) this.channels.set(channel, []); }
  unsubscribe(channel: string): void { this.channels.delete(channel); }
  publish(channel: string, event: unknown): void { if (this.channels.has(channel)) this.channels.get(channel)!.push(event); }
  getEvents(channel: string): unknown[] { return [...(this.channels.get(channel) || [])]; }
  getSnapshot(): EventBusSnapshot { return { channels: this.channels.size }; }
  reset(): void { this.channels.clear(); }
  getReport(): string { return `EventBus[channels=${this.channels.size}]`; }
  exportMetrics(): EventBusMetrics { return { version: 'V54-I24' }; }
}
