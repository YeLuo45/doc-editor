export type HookConfig = {
  timeout?: number;
  retries?: number;
  priority?: number;
  tags?: string[];
};

export type Hook = {
  id: string;
  name: string;
  handler: Function;
  config: HookConfig;
  enabled: boolean;
  createdAt: number;
};

export type HookManagerConfig = {
  maxHooks?: number;
  defaultTimeout?: number;
  enableMetrics?: boolean;
};

const defaultHookManagerConfig: HookManagerConfig = {
  maxHooks: 100,
  defaultTimeout: 5000,
  enableMetrics: true,
};

export class HookManager {
  public config: HookManagerConfig;
  private hooks: Map<string, Hook> = new Map();
  private metrics = {
    totalRegistered: 0,
    totalTriggered: 0,
    totalErrors: 0,
    lastTriggeredAt: 0,
  };

  constructor(config: HookManagerConfig = {}) {
    this.config = { ...defaultHookManagerConfig, ...config };
  }

  register(hook: Omit<Hook, 'id' | 'createdAt'>): string {
    if (this.hooks.size >= (this.config.maxHooks ?? 100)) {
      throw new Error(`Maximum hooks reached: ${this.config.maxHooks}`);
    }
    const id = `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newHook: Hook = {
      ...hook,
      id,
      createdAt: Date.now(),
      enabled: hook.enabled ?? true,
    };
    this.hooks.set(id, newHook);
    this.metrics.totalRegistered++;
    return id;
  }

  unregister(hookId: string): boolean {
    const deleted = this.hooks.delete(hookId);
    return deleted;
  }

  trigger(hookId: string, ...args: any[]): Promise<any> {
    const hook = this.hooks.get(hookId);
    if (!hook) {
      throw new Error(`Hook not found: ${hookId}`);
    }
    if (!hook.enabled) {
      throw new Error(`Hook is disabled: ${hookId}`);
    }
    this.metrics.totalTriggered++;
    this.metrics.lastTriggeredAt = Date.now();
    const timeout = hook.config.timeout ?? this.config.defaultTimeout ?? 5000;
    return Promise.race([
      Promise.resolve(hook.handler(...args)),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Hook timed out: ${hookId}`)), timeout)),
    ]);
  }

  getHooks(tag?: string): Hook[] {
    const all = Array.from(this.hooks.values());
    if (!tag) return all;
    return all.filter(h => h.config.tags?.includes(tag));
  }

  enable(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;
    hook.enabled = true;
    return true;
  }

  disable(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;
    hook.enabled = false;
    return true;
  }

  getSnapshot(): { metrics: typeof this.metrics; hookCount: number; enabledCount: number } {
    return {
      metrics: { ...this.metrics },
      hookCount: this.hooks.size,
      enabledCount: Array.from(this.hooks.values()).filter(h => h.enabled).length,
    };
  }

  reset(): void {
    this.hooks.clear();
    this.metrics = { totalRegistered: 0, totalTriggered: 0, totalErrors: 0, lastTriggeredAt: 0 };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      'HookManager Report',
      `  Registered: ${snap.metrics.totalRegistered}`,
      `  Active Hooks: ${snap.hookCount}`,
      `  Enabled: ${snap.enabledCount}`,
      `  Triggered: ${snap.metrics.totalTriggered}`,
      `  Errors: ${snap.metrics.totalErrors}`,
      `  Last triggered: ${snap.metrics.lastTriggeredAt ? new Date(snap.metrics.lastTriggeredAt).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & typeof this.metrics {
    return {
      version: 'V84-HookManager-1.0',
      ...this.metrics,
    };
  }
}