// Plugin Registry - Manages plugin registration and lookup

import { Plugin } from './types';

export class PluginRegistry {
  private plugins: Map<string, Plugin>;

  constructor() {
    this.plugins = new Map();
  }

  /**
   * Register a plugin (throws if id already exists)
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id '${plugin.id}' is already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Unregister a plugin by id
   */
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by id
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * List all registered plugins
   */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistry();
