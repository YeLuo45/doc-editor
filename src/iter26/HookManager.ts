export type HookManagerConfig = { async?: boolean };
export type HookManagerSnapshot = { hooks: number };
export type HookManagerMetrics = { version: string };

export class HookManager {
  config: HookManagerConfig;
  private hooks: Map<string, (() => void)[]> = new Map();

  constructor(config: HookManagerConfig = {}) { this.config = config; }

  register(name: string, fn: () => void): void {
    if (!this.hooks.has(name)) this.hooks.set(name, []);
    this.hooks.get(name)!.push(fn);
  }
  unregister(name: string, fn: () => void): void {
    const hs = this.hooks.get(name) || [];
    this.hooks.set(name, hs.filter(h => h !== fn));
  }
  trigger(name: string): void { (this.hooks.get(name) || []).forEach(h => h()); }
  getHookCount(name: string): number { return (this.hooks.get(name) || []).length; }
  getSnapshot(): HookManagerSnapshot { return { hooks: this.hooks.size }; }
  reset(): void { this.hooks.clear(); }
  getReport(): string { return `HookManager[hooks=${this.hooks.size}]`; }
  exportMetrics(): HookManagerMetrics { return { version: 'V56-I26' }; }
}
