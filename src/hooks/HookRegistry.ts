/**
 * HookRegistry - Manages hook registration with priority sorting, once execution, and condition filtering
 */

import { HookType, TrustLevel, type HookConfig, type HookRegistryEntry } from './types';
import { HookContext } from './HookContext';
import { TrustHierarchy } from './TrustHierarchy';

export class HookRegistry {
  private hooks: Map<HookType, HookRegistryEntry[]>;
  private trustHierarchy: TrustHierarchy;
  private static readonly STORAGE_KEY = 'doc-editor-hooks-registry';

  constructor(trustHierarchy?: TrustHierarchy) {
    this.hooks = new Map();
    this.trustHierarchy = trustHierarchy || new TrustHierarchy();
    this.initializeHooksMap();
  }

  /**
   * Initialize empty arrays for all hook types
   */
  private initializeHooksMap(): void {
    Object.values(HookType).forEach(type => {
      this.hooks.set(type, []);
    });
  }

  /**
   * Register a new hook
   */
  public register(config: HookConfig): boolean {
    const { type, trustLevel, priority } = config;

    // Check priority permission
    if (!this.trustHierarchy.isPriorityAllowed(trustLevel, priority)) {
      const maxPriority = this.trustHierarchy.getMaxPriority(trustLevel);
      config.priority = maxPriority;
    }

    // Check modify permission
    if (!this.trustHierarchy.canModify(trustLevel)) {
      return false;
    }

    const entry: HookRegistryEntry = {
      ...config,
      executed: false,
    };

    const hooks = this.hooks.get(type) || [];
    hooks.push(entry);
    hooks.sort((a, b) => b.priority - a.priority);
    this.hooks.set(type, hooks);

    return true;
  }

  /**
   * Unregister a hook by id
   */
  public unregister(id: string): boolean {
    for (const [_type, hooks] of this.hooks.entries()) {
      const index = hooks.findIndex(h => h.id === id);
      if (index !== -1) {
        const hook = hooks[index];
        if (!this.trustHierarchy.canDelete(hook.trustLevel)) {
          return false;
        }
        hooks.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Get all registered hooks for a type
   */
  public getHooks(type: HookType): HookRegistryEntry[] {
    return this.hooks.get(type) || [];
  }

  /**
   * Get all registered hooks
   */
  public getAllHooks(): Map<HookType, HookRegistryEntry[]> {
    return new Map(this.hooks);
  }

  /**
   * Get hooks filtered by condition
   */
  public getHooksFiltered(type: HookType, context: HookContext): HookRegistryEntry[] {
    const hooks = this.getHooks(type);
    return hooks.filter(hook => {
      if (hook.enabled === false) return false;
      if (hook.once && hook.executed) return false;
      if (hook.condition && !hook.condition(context)) return false;
      return true;
    });
  }

  /**
   * Check if hook exists
   */
  public has(type: HookType, id: string): boolean {
    const hooks = this.getHooks(type);
    return hooks.some(h => h.id === id);
  }

  /**
   * Enable a hook
   */
  public enable(id: string): boolean {
    return this.setEnabled(id, true);
  }

  /**
   * Disable a hook
   */
  public disable(id: string): boolean {
    return this.setEnabled(id, false);
  }

  /**
   * Set hook enabled state
   */
  private setEnabled(id: string, enabled: boolean): boolean {
    for (const [_type, hooks] of this.hooks.entries()) {
      const hook = hooks.find(h => h.id === id);
      if (hook) {
        hook.enabled = enabled;
        return true;
      }
    }
    return false;
  }

  /**
   * Mark hook as executed (for once hooks)
   */
  public markExecuted(type: HookType, id: string): void {
    const hooks = this.getHooks(type);
    const hook = hooks.find(h => h.id === id);
    if (hook) {
      hook.executed = true;
      hook.lastExecutedAt = Date.now();
    }
  }

  /**
   * Reset executed state for all hooks
   */
  public resetExecuted(): void {
    for (const hooks of this.hooks.values()) {
      hooks.forEach(h => {
        h.executed = false;
      });
    }
  }

  /**
   * Clear all hooks for a type
   */
  public clear(type: HookType): void {
    this.hooks.set(type, []);
  }

  /**
   * Clear all hooks
   */
  public clearAll(): void {
    this.initializeHooksMap();
  }

  /**
   * Get hook count by type
   */
  public count(type: HookType): number {
    return this.getHooks(type).length;
  }

  /**
   * Get total hook count
   */
  public totalCount(): number {
    let total = 0;
    for (const hooks of this.hooks.values()) {
      total += hooks.length;
    }
    return total;
  }

  /**
   * Get hooks by trust level
   */
  public getByTrustLevel(trustLevel: TrustLevel): Array<{ type: HookType; entry: HookRegistryEntry }> {
    const results: Array<{ type: HookType; entry: HookRegistryEntry }> = [];
    for (const [type, hooks] of this.hooks.entries()) {
      for (const entry of hooks) {
        if (entry.trustLevel === trustLevel) {
          results.push({ type, entry });
        }
      }
    }
    return results;
  }

  /**
   * Save registry to localStorage
   */
  public save(): void {
    try {
      const data: Array<[HookType, HookRegistryEntry[]]> = [];
      this.hooks.forEach((hooks, type) => {
        data.push([type, hooks]);
      });
      localStorage.setItem(HookRegistry.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage might be unavailable
    }
  }

  /**
   * Load registry from localStorage
   */
  public load(): void {
    try {
      const data = localStorage.getItem(HookRegistry.STORAGE_KEY);
      if (!data) return;
      const parsed: Array<[HookType, HookRegistryEntry[]]> = JSON.parse(data);
      parsed.forEach(([type, hooks]) => {
        this.hooks.set(type, hooks);
      });
    } catch {
      // localStorage might be unavailable or invalid
    }
  }
}

export default HookRegistry;