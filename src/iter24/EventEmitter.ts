export type EventEmitterConfig = { debug?: boolean };
export type EventEmitterSnapshot = { listeners: number };
export type EventEmitterMetrics = { version: string };

export class EventEmitter {
  config: EventEmitterConfig;
  private events: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  constructor(config: EventEmitterConfig = {}) { this.config = config; }

  on(event: string, fn: (...args: unknown[]) => void): void {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(fn);
  }
  off(event: string, fn: (...args: unknown[]) => void): void {
    const handlers = this.events.get(event) || [];
    this.events.set(event, handlers.filter(h => h !== fn));
  }
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.events.get(event) || [];
    handlers.forEach(h => h(...args));
  }
  listenerCount(event: string): number { return (this.events.get(event) || []).length; }
  getSnapshot(): EventEmitterSnapshot { return { listeners: this.events.size }; }
  reset(): void { this.events.clear(); }
  getReport(): string { return `EventEmitter[events=${this.events.size}]`; }
  exportMetrics(): EventEmitterMetrics { return { version: 'V54-I24' }; }
}
