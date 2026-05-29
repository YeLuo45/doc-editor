/**
 * V42 Iteration 12 - Port Module
 */

export type PortConfig = { protocol?: string };
export type PortSnapshot = { number: number; isOpen: boolean };
export type PortMetrics = { version: string };

export class Port {
  config: PortConfig;
  private isOpen = false;
  readonly number: number;

  constructor(number: number, config: PortConfig = {}) {
    this.number = number;
    this.config = config;
  }

  openPort(): void { this.isOpen = true; }
  closePort(): void { this.isOpen = false; }
  isOpenPort(): boolean { return this.isOpen; }
  getSnapshot(): PortSnapshot { return { number: this.number, isOpen: this.isOpen }; }
  reset(): void { this.isOpen = false; }
  getReport(): string { return `Port[${this.number}, open=${this.isOpen}]`; }
  exportMetrics(): PortMetrics { return { version: 'V42-I12' }; }
}
