export type EventHandlerConfig = { priority?: number };
export type EventHandlerSnapshot = { name: string; handled: number };
export type EventHandlerMetrics = { version: string };

export class EventHandler {
  config: EventHandlerConfig;
  readonly name: string;
  private handled = 0;

  constructor(name: string, config: EventHandlerConfig = {}) {
    this.name = name;
    this.config = config;
  }

  handle(event: unknown): void { this.handled++; }
  getHandledCount(): number { return this.handled; }
  getSnapshot(): EventHandlerSnapshot { return { name: this.name, handled: this.handled }; }
  reset(): void { this.handled = 0; }
  getReport(): string { return `EventHandler[${this.name}, handled=${this.handled}]`; }
  exportMetrics(): EventHandlerMetrics { return { version: 'V54-I24' }; }
}
