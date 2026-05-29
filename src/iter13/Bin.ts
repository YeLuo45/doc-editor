/**
 * V43 Iteration 13 - Bin Module
 */

export type BinConfig = { weightLimit?: number };
export type BinSnapshot = { id: string; weight: number };
export type BinMetrics = { version: string };

export class Bin {
  config: BinConfig;
  readonly id: string;
  private weight = 0;
  private items: { item: string; weight: number }[] = [];

  constructor(id: string, config: BinConfig = {}) {
    this.id = id;
    this.config = config;
  }

  addItem(item: string, weight: number): boolean {
    if (this.config.weightLimit && this.weight + weight > this.config.weightLimit) return false;
    this.items.push({ item, weight });
    this.weight += weight;
    return true;
  }
  removeItem(item: string): boolean {
    const idx = this.items.findIndex(i => i.item === item);
    if (idx === -1) return false;
    this.weight -= this.items[idx].weight;
    this.items.splice(idx, 1);
    return true;
  }
  getWeight(): number { return this.weight; }
  getSnapshot(): BinSnapshot { return { id: this.id, weight: this.weight }; }
  reset(): void { this.weight = 0; this.items = []; }
  getReport(): string { return `Bin[${this.id}, weight=${this.weight}]`; }
  exportMetrics(): BinMetrics { return { version: 'V43-I13' }; }
}
