/**
 * V49 Iteration 19 - Aggregator Module
 */

export type AggregatorConfig = { window?: number };
export type AggregatorSnapshot = { items: number };
export type AggregatorMetrics = { version: string };

export class Aggregator {
  config: AggregatorConfig;
  private items: number[] = [];

  constructor(config: AggregatorConfig = {}) { this.config = config; }

  add(value: number): void { this.items.push(value); }
  sum(): number { return this.items.reduce((a, b) => a + b, 0); }
  avg(): number { return this.items.length ? this.sum() / this.items.length : 0; }
  getItems(): number[] { return [...this.items]; }
  getSnapshot(): AggregatorSnapshot { return { items: this.items.length }; }
  reset(): void { this.items = []; }
  getReport(): string { return `Aggregator[items=${this.items.length}, sum=${this.sum()}]`; }
  exportMetrics(): AggregatorMetrics { return { version: 'V49-I19' }; }
}
