export type MiddlewareConfig = { name?: string };
export type MiddlewareSnapshot = { chain: number };
export type MiddlewareMetrics = { version: string };

export class Middleware {
  config: MiddlewareConfig;
  private chain: ((input: string) => string)[] = [];

  constructor(config: MiddlewareConfig = {}) { this.config = config; }

  use(fn: (input: string) => string): void { this.chain.push(fn); }
  execute(input: string): string { let result = input; for (const fn of this.chain) result = fn(result); return result; }
  getChainSize(): number { return this.chain.length; }
  getSnapshot(): MiddlewareSnapshot { return { chain: this.chain.length }; }
  reset(): void { this.chain = []; }
  getReport(): string { return `Middleware[chain=${this.chain.length}]`; }
  exportMetrics(): MiddlewareMetrics { return { version: 'V53-I23' }; }
}