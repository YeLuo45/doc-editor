/**
 * V49 Iteration 19 - Sorter Module
 */

export type SorterConfig = { order?: 'asc' | 'desc' };
export type SorterSnapshot = { items: number };
export type SorterMetrics = { version: string };

export class Sorter {
  config: SorterConfig;
  private items: string[] = [];

  constructor(config: SorterConfig = {}) { this.config = config; }

  add(item: string): void { this.items.push(item); }
  sort(): string[] {
    const dir = this.config.order === 'desc' ? -1 : 1;
    return [...this.items].sort((a, b) => dir * a.localeCompare(b));
  }
  getItems(): string[] { return [...this.items]; }
  getSnapshot(): SorterSnapshot { return { items: this.items.length }; }
  reset(): void { this.items = []; }
  getReport(): string { return `Sorter[items=${this.items.length}]`; }
  exportMetrics(): SorterMetrics { return { version: 'V49-I19' }; }
}
