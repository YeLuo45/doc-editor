/**
 * HookRegistry - Global hook registry for doc-editor
 * Manages registration and firing of all document and collaboration hooks
 */

export type HookPriority = 'high' | 'normal' | 'low';

export interface HookRegistration<T = unknown> {
  id: string;
  name: string;
  handler: (data: T) => void | Promise<void>;
  priority: HookPriority;
  enabled: boolean;
}

export type DocumentHookEvent =
  | 'document:create'
  | 'document:open'
  | 'document:close'
  | 'document:save'
  | 'document:delete'
  | 'document:rename'
  | 'document:move'
  | 'document:update';

export type CollabHookEvent =
  | 'collab:join'
  | 'collab:leave'
  | 'collab:operation'
  | 'collab:sync'
  | 'collab:conflict'
  | 'collab:presence';

export type PluginHookEvent =
  | 'plugin:load'
  | 'plugin:unload'
  | 'plugin:enable'
  | 'plugin:disable'
  | 'plugin:error';

export type AnyHookEvent = DocumentHookEvent | CollabHookEvent | PluginHookEvent;

export class HookRegistry {
  private hooks: Map<string, HookRegistration[]> = new Map();
  private sortedHooks: Map<string, boolean> = new Map();

  constructor() {
    this.hooks = new Map();
    this.sortedHooks = new Map();
  }

  /**
   * Register a hook handler
   */
  register<T = unknown>(
    event: string,
    name: string,
    handler: (data: T) => void | Promise<void>,
    priority: HookPriority = 'normal'
  ): string {
    const id = `${event}:${name}:${Date.now()}`;
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    const registrations = this.hooks.get(event)!;
    registrations.push({ id, name, handler, priority, enabled: true });
    this.sortedHooks.set(event, false); // needs re-sort
    return id;
  }

  /**
   * Register hook from config object (HookLifecycleEngine compatibility)
   */
  registerFromConfig(config: {
    id: string;
    type?: string;
    name?: string;
    fn: (data: unknown) => void | Promise<void>;
    priority?: number;
    enabled?: boolean;
    trustLevel?: string;
  }): boolean {
    const event = config.type ? String(config.type) : 'unknown';
    const name = config.name || config.id;
    const priority = config.priority !== undefined
      ? (config.priority <= 25 ? 'high' : config.priority >= 75 ? 'low' : 'normal')
      : 'normal';
    const handler = config.fn;
    const id = this.register(event, name, handler, priority);
    return id.length > 0;
  }

  /**
   * Unregister a hook by id
   */
  unregister(hookId: string): boolean {
    for (const [event, registrations] of this.hooks.entries()) {
      const idx = registrations.findIndex(r => r.id === hookId);
      if (idx !== -1) {
        registrations.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Unregister all hooks for an event or name
   */
  unregisterAll(eventOrName?: string): number {
    let count = 0;
    if (!eventOrName) {
      for (const registrations of this.hooks.values()) {
        count += registrations.length;
      }
      this.hooks.clear();
      return count;
    }
    for (const [event, registrations] of this.hooks.entries()) {
      const before = registrations.length;
      if (event === eventOrName || registrations.some(r => r.name === eventOrName)) {
        const filtered = registrations.filter(
          r => r.event !== eventOrName && r.name !== eventOrName
        );
        count += before - filtered.length;
        this.hooks.set(event, filtered);
      }
    }
    return count;
  }

  /**
   * Fire all handlers for an event
   */
  async fire<T = unknown>(event: string, data: T): Promise<void> {
    if (!this.hooks.has(event)) return;
    const registrations = this.getSortedHooks(event);
    const promises: Promise<void>[] = [];
    for (const reg of registrations) {
      if (reg.enabled) {
        try {
          const result = reg.handler(data);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (err) {
          console.error(`Hook ${reg.id} error:`, err);
        }
      }
    }
    await Promise.allSettled(promises);
  }

  /**
   * Get all registered events
   */
  getEvents(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hook count
   */
  getHookCount(event?: string): number {
    if (event) {
      return this.hooks.get(event)?.length ?? 0;
    }
    let total = 0;
    for (const regs of this.hooks.values()) {
      total += regs.length;
    }
    return total;
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    for (const registrations of this.hooks.values()) {
      const reg = registrations.find(r => r.id === hookId);
      if (reg) {
        reg.enabled = enabled;
        return true;
      }
    }
    return false;
  }

  /**
   * Check if an event has handlers
   */
  hasHandlers(event: string): boolean {
    const regs = this.hooks.get(event);
    return regs !== undefined && regs.length > 0 && regs.some(r => r.enabled);
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.sortedHooks.clear();
  }

  private getSortedHooks(event: string): HookRegistration[] {
    if (!this.sortedHooks.get(event)) {
      const regs = this.hooks.get(event) ?? [];
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      regs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      this.hooks.set(event, regs);
      this.sortedHooks.set(event, true);
    }
    return this.hooks.get(event)!;
  }

  /**
   * Get hooks filtered by event name and context (for HookLifecycleEngine compatibility)
   */
  getHooksFiltered(event: string | number, _context?: unknown): HookRegistration[] {
    // Handle both string and enum value lookups
    const key = String(event);
    return this.getSortedHooks(key);
  }

  /**
   * Count hooks by event name (for HookLifecycleEngine compatibility)
   */
  count(event?: string): number {
    if (event) {
      return this.hooks.get(event)?.length ?? 0;
    }
    let total = 0;
    for (const regs of this.hooks.values()) {
      total += regs.length;
    }
    return total;
  }

  /**
   * Total count of all hooks
   */
  totalCount(): number {
    let total = 0;
    for (const regs of this.hooks.values()) {
      total += regs.length;
    }
    return total;
  }

  /**
   * Enable a hook by id
   */
  enable(hookId: string): boolean {
    return this.setEnabled(hookId, true);
  }

  /**
   * Disable a hook by id
   */
  disable(hookId: string): boolean {
    return this.setEnabled(hookId, false);
  }

  /**
   * Unregister a hook by id
   */
  unregister(hookId: string): boolean {
    for (const [event, registrations] of this.hooks.entries()) {
      const idx = registrations.findIndex(r => r.id === hookId);
      if (idx !== -1) {
        registrations.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Mark hook as executed
   */
  markExecuted(event: string, hookId: string): void {
    // No-op for basic registry, HookLifecycleEngine tracks this separately
  }

  /**
   * Get hooks by trust level (for HookLifecycleEngine compatibility)
   */
  getByTrustLevel(_trustLevel: string): HookRegistration[] {
    // Trust level not in basic HookRegistry - return all
    let all: HookRegistration[] = [];
    for (const regs of this.hooks.values()) {
      all = all.concat(regs);
    }
    return all;
  }
}

// Singleton instance
export const globalHookRegistry = new HookRegistry();