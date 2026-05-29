export type EventLoopConfig = { interval?: number };
export type EventLoopSnapshot = { queue: number; processed: number };
export type EventLoopMetrics = { version: string };

export class EventLoop {
  config: EventLoopConfig;
  private queue: (() => void)[] = [];
  private processed = 0;

  constructor(config: EventLoopConfig = {}) { this.config = config; }

  enqueue(fn: () => void): void { this.queue.push(fn); }
  tick(): void { if (this.queue.length > 0) { this.queue.shift()!(); this.processed++; } }
  size(): number { return this.queue.length; }
  getProcessed(): number { return this.processed; }
  getSnapshot(): EventLoopSnapshot { return { queue: this.queue.length, processed: this.processed }; }
  reset(): void { this.queue = []; this.processed = 0; }
  getReport(): string { return `EventLoop[queue=${this.queue.length}, processed=${this.processed}]`; }
  exportMetrics(): EventLoopMetrics { return { version: 'V54-I24' }; }
}
