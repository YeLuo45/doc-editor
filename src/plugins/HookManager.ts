/**
 * HookManager - Plugin Lifecycle Hook Management
 * Integrates with existing HookLifecycleEngine for 17 lifecycle hooks
 */

import { HookLifecycleEngine } from '../hooks/HookLifecycleEngine.js';
import { HookContext } from '../hooks/HookContext.js';
import { HookType, TrustLevel } from '../hooks/types.js';
import type { PluginHookType, PluginHookConfig } from './types.js';

const PLUGIN_HOOK_PREFIX = 'plugin.';

export class HookManager {
  private engine: HookLifecycleEngine;
  private pluginHooks: Map<string, PluginHookConfig> = new Map();
  private pluginHookBindings: Map<string, string> = new Map(); // pluginId -> hookId

  constructor(engine?: HookLifecycleEngine) {
    this.engine = engine || new HookLifecycleEngine();
  }

  /**
   * Get the underlying hook engine
   */
  getEngine(): HookLifecycleEngine {
    return this.engine;
  }

  /**
   * Map plugin hook type to engine hook type
   */
  private mapHookType(pluginType: PluginHookType): HookType | null {
    const mapping: Record<PluginHookType, HookType | null> = {
      'plugin.beforeLoad': HookType.BEFORE_LOAD,
      'plugin.afterLoad': HookType.AFTER_LOAD,
      'editor.beforeSave': HookType.BEFORE_SAVE,
      'editor.afterSave': HookType.AFTER_SAVE,
      'editor.beforeRender': HookType.BEFORE_RENDER,
      'editor.afterRender': HookType.AFTER_RENDER,
      'plugin.beforeActivate': null,
      'plugin.afterActivate': null,
      'plugin.beforeDeactivate': null,
      'plugin.afterDeactivate': null,
      'plugin.beforeExecute': null,
      'plugin.afterExecute': null,
    };
    return mapping[pluginType] || null;
  }

  /**
   * Register a plugin hook
   */
  register(config: PluginHookConfig): boolean {
    const { id, type, fn, pluginId, priority } = config;

    // Store plugin hook config
    this.pluginHooks.set(id, config);
    this.pluginHookBindings.set(pluginId, id);

    // Map to engine hook if possible
    const engineType = this.mapHookType(type);
    if (engineType) {
      const hookFn = async (ctx: HookContext) => {
        return fn(ctx.payload);
      };
      return this.engine.register({
        id: `${PLUGIN_HOOK_PREFIX}${id}`,
        type: engineType,
        fn: hookFn as never,
        trustLevel: TrustLevel.DEVELOPER,
        priority: priority || 50,
        once: false,
      });
    }

    // For non-mapped hooks, return success (they're tracked internally)
    return true;
  }

  /**
   * Unregister a plugin hook
   */
  unregister(id: string): boolean {
    const config = this.pluginHooks.get(id);
    if (!config) {
      return false;
    }

    this.pluginHooks.delete(id);
    this.pluginHookBindings.delete(config.pluginId);

    // Unregister from engine
    return this.engine.unregister(`${PLUGIN_HOOK_PREFIX}${id}`);
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterByPlugin(pluginId: string): boolean {
    const hookId = this.pluginHookBindings.get(pluginId);
    if (hookId) {
      return this.unregister(hookId);
    }
    return false;
  }

  /**
   * Get plugin hook config
   */
  getPluginHook(id: string): PluginHookConfig | undefined {
    return this.pluginHooks.get(id);
  }

  /**
   * Get hook by plugin ID
   */
  getByPlugin(pluginId: string): PluginHookConfig | undefined {
    const hookId = this.pluginHookBindings.get(pluginId);
    if (hookId) {
      return this.pluginHooks.get(hookId);
    }
    return undefined;
  }

  /**
   * Trigger a plugin hook
   */
  async triggerPluginHook(type: PluginHookType, payload: unknown): Promise<{ success: boolean; data?: unknown }> {
    const engineType = this.mapHookType(type);
    if (!engineType) {
      // Execute plugin-internal hooks directly
      const results: unknown[] = [];
      this.pluginHooks.forEach(config => {
        if (config.type === type) {
          try {
            results.push(config.fn(payload));
          } catch {
            // Ignore individual hook failures
          }
        }
      });
      return { success: results.length > 0, data: results };
    }

    const context = HookContext.forBefore(engineType, { pluginHook: type, payload });
    const result = await this.engine.trigger(engineType, context);
    return { success: result.success, data: result.data };
  }

  /**
   * Trigger before plugin loads
   */
  async beforePluginLoad(pluginId: string, pluginData: unknown): Promise<boolean> {
    const context = HookContext.forBefore(HookType.BEFORE_LOAD, { pluginId, data: pluginData });
    const result = await this.engine.trigger(HookType.BEFORE_LOAD, context);
    return !context.preventDefault && result.success;
  }

  /**
   * Trigger after plugin loads
   */
  async afterPluginLoad(pluginId: string, pluginData: unknown): Promise<void> {
    const context = HookContext.forAfter(HookType.AFTER_LOAD, { pluginId, data: pluginData });
    await this.engine.trigger(HookType.AFTER_LOAD, context);
  }

  /**
   * Trigger before plugin activates
   */
  async beforePluginActivate(pluginId: string): Promise<boolean> {
    const results = await this.triggerPluginHook('plugin.beforeActivate', { pluginId });
    return results.success;
  }

  /**
   * Trigger after plugin activates
   */
  async afterPluginActivate(pluginId: string): Promise<void> {
    await this.triggerPluginHook('plugin.afterActivate', { pluginId });
  }

  /**
   * Trigger before plugin deactivates
   */
  async beforePluginDeactivate(pluginId: string): Promise<boolean> {
    const results = await this.triggerPluginHook('plugin.beforeDeactivate', { pluginId });
    return results.success;
  }

  /**
   * Trigger after plugin deactivates
   */
  async afterPluginDeactivate(pluginId: string): Promise<void> {
    await this.triggerPluginHook('plugin.afterDeactivate', { pluginId });
  }

  /**
   * Trigger before plugin executes
   */
  async beforePluginExecute(pluginId: string, input: unknown): Promise<boolean> {
    const results = await this.triggerPluginHook('plugin.beforeExecute', { pluginId, input });
    return results.success;
  }

  /**
   * Trigger after plugin executes
   */
  async afterPluginExecute(pluginId: string, output: unknown): Promise<void> {
    await this.triggerPluginHook('plugin.afterExecute', { pluginId, output });
  }

  /**
   * Get all registered plugin hooks
   */
  getAllPluginHooks(): PluginHookConfig[] {
    return Array.from(this.pluginHooks.values());
  }

  /**
   * Get hook count
   */
  count(): number {
    return this.pluginHooks.size;
  }

  /**
   * Check if plugin hook exists
   */
  has(pluginId: string): boolean {
    return this.pluginHookBindings.has(pluginId);
  }

  /**
   * Clear all plugin hooks
   */
  clear(): void {
    this.pluginHooks.forEach((_, id) => {
      this.engine.unregister(`${PLUGIN_HOOK_PREFIX}${id}`);
    });
    this.pluginHooks.clear();
    this.pluginHookBindings.clear();
  }

  /**
   * Get engine statistics
   */
  getStats(): { total: number; byType: Record<string, number>; byTrustLevel: Record<string, number> } {
    return this.engine.getStats();
  }
}

// Singleton instance
let managerInstance: HookManager | null = null;

export function getHookManager(): HookManager {
  if (!managerInstance) {
    managerInstance = new HookManager();
  }
  return managerInstance;
}

export function resetHookManager(): void {
  managerInstance = null;
}