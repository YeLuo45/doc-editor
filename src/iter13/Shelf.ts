/**
 * V43 Iteration 13 - Shelf Module
 */

export type ShelfConfig = { capacity?: number };
export type ShelfSnapshot = { id: string; items: number };
export type ShelfMetrics = { version: string };

export class Shelf {
  config: ShelfConfig;
  readonly id: string;
  private items: string[] = [];

  constructor(id: string, config: ShelfConfig = {}) {
    this.id = id;
    this.config = config;
  }

  addItem(item: string): boolean {
    if (this.config.capacity && this.items.length >= this.config.capacity) return false;
    this.items.push(item);
    return true;
  }
  removeItem(item: string): boolean {
    const idx = this.items.indexOf(item);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
  getItems(): string[] { return [...this.items]; }
  getSnapshot(): ShelfSnapshot { return { id: this.id, items: this.items.length }; }
  reset(): void { this.items = []; }
  getReport(): string { return `Shelf[${this.id}, items=${this.items.length}]`; }
  exportMetrics(): ShelfMetrics { return { version: 'V43-I13' }; }
}
