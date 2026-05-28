/**
 * PluginHookSystem - V20 Hook Lifecycle Engine for doc-editor
 * Manages plugin lifecycle hooks and integrates with the global hook registry
 */

import { globalHookRegistry, PluginHookEvent, AnyHookEvent, HookRegistration, HookPriority } from './HookRegistry';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  enabled?: boolean;
}

export interface PluginLoadPayload {
  pluginId: string;
  pluginName: string;
  version: string;
  timestamp: number;
  metadata?: PluginMetadata;
}

export interface PluginUnloadPayload {
  pluginId: string;
  reason?: 'uninstall' | 'disable' | 'reload' | 'error';
  timestamp: number;
}

export interface PluginErrorPayload {
  pluginId: string;
  pluginName: string;
  error: Error;
  phase: 'load' | 'init' | 'runtime' | 'unload';
  timestamp: number;
}

export type PluginHookPayload = PluginLoadPayload | PluginUnloadPayload | PluginErrorPayload;

export interface Plugin {
  id: string;
  metadata: PluginMetadata;
  hooks: Map<string, string>; // event -> hookId mapping
  enabled: boolean;
  loadedAt?: number;
}

export class PluginHookSystem {
  private registry: typeof globalHookRegistry;
  private plugins: Map<string, Plugin> = new Map();
  private pluginLoadHandlers: string[] = [];
  private pluginUnloadHandlers: string[] = [];
  private pluginErrorHandlers: string[] = [];

  constructor(registry: typeof globalHookRegistry = globalHookRegistry) {
    this.registry = registry;
  }

  /**
   * Register a plugin with the system
   */
  registerPlugin(metadata: PluginMetadata): string {
    const existing = this.plugins.get(metadata.id);
    if (existing) {
      throw new Error(`Plugin with id '${metadata.id}' is already registered`);
    }

    const plugin: Plugin = {
      id: metadata.id,
      metadata: {
        ...metadata,
        enabled: metadata.enabled ?? true,
      },
      hooks: new Map(),
      enabled: metadata.enabled ?? true,
      loadedAt: Date.now(),
    };

    this.plugins.set(metadata.id, plugin);

    // Fire plugin:load event
    const loadPayload: PluginLoadPayload = {
      pluginId: metadata.id,
      pluginName: metadata.name,
      version: metadata.version,
      timestamp: Date.now(),
      metadata,
    };
    this.registry.fire('plugin:load', loadPayload);

    return metadata.id;
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string, reason: PluginUnloadPayload['reason'] = 'uninstall'): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    // Unregister all hooks for this plugin
    for (const hookId of plugin.hooks.values()) {
      this.registry.unregister(hookId);
    }

    this.plugins.delete(pluginId);

    // Fire plugin:unload event
    const unloadPayload: PluginUnloadPayload = {
      pluginId,
      reason,
      timestamp: Date.now(),
    };
    this.registry.fire('plugin:unload', unloadPayload);

    return true;
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.enabled = true;
    plugin.metadata.enabled = true;

    // Fire plugin:enable event
    this.registry.fire('plugin:enable', {
      pluginId,
      pluginName: plugin.metadata.name,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.enabled = false;
    plugin.metadata.enabled = false;

    // Fire plugin:disable event
    this.registry.fire('plugin:disable', {
      pluginId,
      pluginName: plugin.metadata.name,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Register a hook handler for a specific plugin
   */
  registerPluginHook<T = unknown>(
    pluginId: string,
    event: AnyHookEvent,
    name: string,
    handler: (data: T) => void | Promise<void>,
    priority: HookPriority = 'normal'
  ): string | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return null;
    }

    const hookId = this.registry.register(event, name, handler, priority);
    plugin.hooks.set(event, hookId);

    return hookId;
  }

  /**
   * Unregister a plugin hook by event
   */
  unregisterPluginHook(pluginId: string, event: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    const hookId = plugin.hooks.get(event);
    if (!hookId) {
      return false;
    }

    const success = this.registry.unregister(hookId);
    if (success) {
      plugin.hooks.delete(event);
    }

    return success;
  }

  /**
   * Get a plugin by id
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by enabled state
   */
  getPluginsByEnabled(enabled: boolean): Plugin[] {
    return this.getAllPlugins().filter(p => p.enabled === enabled);
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  /**
   * Fire a plugin error event
   */
  firePluginError(pluginId: string, error: Error, phase: PluginErrorPayload['phase']): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    const errorPayload: PluginErrorPayload = {
      pluginId,
      pluginName: plugin.metadata.name,
      error,
      phase,
      timestamp: Date.now(),
    };

    this.registry.fire('plugin:error', errorPayload);
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Get count of enabled plugins
   */
  getEnabledPluginCount(): number {
    return this.getPluginsByEnabled(true).length;
  }

  /**
   * Check if any plugins are loaded
   */
  hasPlugins(): boolean {
    return this.plugins.size > 0;
  }

  /**
   * Clear all plugins (used for testing)
   */
  clear(): void {
    for (const plugin of this.plugins.values()) {
      for (const hookId of plugin.hooks.values()) {
        this.registry.unregister(hookId);
      }
    }
    this.plugins.clear();
    this.pluginLoadHandlers = [];
    this.pluginUnloadHandlers = [];
    this.pluginErrorHandlers = [];
  }
}

// Singleton instance
export const pluginHookSystem = new PluginHookSystem();