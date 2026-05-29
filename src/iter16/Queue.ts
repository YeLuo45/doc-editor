/**
 * V46 Iteration 16 - Queue Module
 */

export type QueueConfig = { priority?: boolean };
export type QueueSnapshot = { length: number };
export type QueueMetrics = { version: string };

export class Queue {
  config: QueueConfig;
  private items: string[] = [];

  constructor(config: QueueConfig = {}) { this.config = config; }

  enqueue(item: string): void { this.items.push(item); }
  dequeue(): string | undefined { return this.items.shift(); }
  front(): string | undefined { return this.items[0]; }
  isEmpty(): boolean { return this.items.length === 0; }
  length(): number { return this.items.length; }
  getSnapshot(): QueueSnapshot { return { length: this.items.length }; }
  reset(): void { this.items = []; }
  getReport(): string { return `Queue[length=${this.items.length}]`; }
  exportMetrics(): QueueMetrics { return { version: 'V46-I16' }; }
}
