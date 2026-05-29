/**
 * V48 Iteration 18 - Edge Module
 */

export type EdgeConfig = { weight?: number };
export type EdgeSnapshot = { from: string; to: string; weight: number };
export type EdgeMetrics = { version: string };

export class Edge {
  config: EdgeConfig;
  readonly from: string;
  readonly to: string;
  private weight: number;

  constructor(from: string, to: string, config: EdgeConfig = {}) {
    this.from = from;
    this.to = to;
    this.weight = config.weight || 1;
    this.config = config;
  }

  getWeight(): number { return this.weight; }
  setWeight(w: number): void { this.weight = w; }
  getSnapshot(): EdgeSnapshot { return { from: this.from, to: this.to, weight: this.weight }; }
  reset(): void { this.weight = this.config.weight || 1; }
  getReport(): string { return `Edge[${this.from}->${this.to}, weight=${this.weight}]`; }
  exportMetrics(): EdgeMetrics { return { version: 'V48-I18' }; }
}
