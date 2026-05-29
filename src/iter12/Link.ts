/**
 * V42 Iteration 12 - Link Module
 */

export type LinkConfig = { bandwidth?: number };
export type LinkSnapshot = { active: boolean };
export type LinkMetrics = { version: string };

export class Link {
  config: LinkConfig;
  private active = false;

  constructor(config: LinkConfig = {}) { this.config = config; }

  up(): void { this.active = true; }
  down(): void { this.active = false; }
  isActive(): boolean { return this.active; }
  getSnapshot(): LinkSnapshot { return { active: this.active }; }
  reset(): void { this.active = false; }
  getReport(): string { return `Link[active=${this.active}]`; }
  exportMetrics(): LinkMetrics { return { version: 'V42-I12' }; }
}
