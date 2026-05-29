/**
 * V60 Plugin Registry - Plugin Registration and Management
 * Manages plugin lifecycle: register, unregister, enable, disable, getPlugins
 */

import type { PluginMetadata, PluginType, PluginStatus, PluginInstance } from '../plugins/types.js';

export interface RegistryConfig {
  maxPlugins: number;
  autoActivate: boolean;
  storagePrefix: string;
}

export interface PluginEntry {
  instance: PluginInstance;
  config: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  registeredAt: number;
}

const DEFAULT_CONFIG: RegistryConfig = {
  maxPlugins: 100,
  autoActivate: false,
  storagePrefix: 'doc-editor-v60-plugins-',
};

export class PluginRegistry {
  public readonly config: RegistryConfig;
  private plugins: Map<string, PluginEntry> = new Map();
  private callHistory: string[] = [];

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private trackCall(method: string): void {
    this.callHistory.push(`${method}@${Date.now()}`);
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-500);
    }
  }

  /**
   * Register a new plugin
   */
  register(metadata: PluginMetadata, config: Record<string, unknown> = {}): void {
    this.trackCall('register');

    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin ${metadata.id} already registered`);
    }

    if (this.plugins.size >= this.config.maxPlugins) {
      throw new Error(`Maximum plugin limit (${this.config.maxPlugins}) reached`);
    }

    const instance: PluginInstance = {
      metadata,
      status: 'registered',
    };

    this.plugins.set(metadata.id, {
      instance,
      config,
      enabled: true,
      priority: 50,
      registeredAt: Date.now(),
    });
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    this.trackCall('unregister');

    if (!this.plugins.has(pluginId)) {
      return false;
    }

    this.plugins.delete(pluginId);
    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginMetadata[] {
    this.trackCall('getPlugins');
    return Array.from(this.plugins.values()).map(entry => entry.instance.metadata);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId)?.instance.metadata;
  }

  /**
   * Get plugin instance (includes status)
   */
  getPluginInstance(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId)?.instance;
  }

  /**
   * Find plugins by type
   */
  getPluginsByType(type: PluginType): PluginMetadata[] {
    return this.getPlugins().filter(p => p.type === type);
  }

  /**
   * Check if plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get count of registered plugins
   */
  size(): number {
    return this.plugins.size;
  }

  /**
   * Enable a plugin
   */
  enable(pluginId: string): boolean {
    this.trackCall('enable');
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }
    entry.enabled = true;
    return true;
  }

  /**
   * Disable a plugin
   */
  disable(pluginId: string): boolean {
    this.trackCall('disable');
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }
    entry.enabled = false;
    return true;
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  /**
   * Set plugin priority
   */
  setPriority(pluginId: string, priority: number): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }
    entry.priority = Math.max(0, Math.min(100, priority));
    return true;
  }

  /**
   * Get plugin priority
   */
  getPriority(pluginId: string): number {
    return this.plugins.get(pluginId)?.priority ?? 0;
  }

  /**
   * Get plugin status
   */
  getStatus(pluginId: string): PluginStatus | undefined {
    return this.plugins.get(pluginId)?.instance.status;
  }

  /**
   * Set plugin status
   */
  setStatus(pluginId: string, status: PluginStatus): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }
    entry.instance.status = status;
    return true;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const pluginsArray = Array.from(this.plugins.values());
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    pluginsArray.forEach(entry => {
      const type = entry.instance.metadata.type;
      const status = entry.instance.status;
      byType[type] = (byType[type] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      metrics: {
        totalPlugins: this.plugins.size,
        enabledPlugins: pluginsArray.filter(e => e.enabled).length,
        disabledPlugins: pluginsArray.filter(e => !e.enabled).length,
        byType,
        byStatus,
        callHistorySize: this.callHistory.length,
      },
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.plugins.clear();
    this.callHistory = [];
  }

  /**
   * Generate status report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== PluginRegistry Report ===',
      `Total Plugins: ${snapshot.metrics.totalPlugins}`,
      `Enabled: ${snapshot.metrics.enabledPlugins}`,
      `Disabled: ${snapshot.metrics.disabledPlugins}`,
      `Call History: ${snapshot.metrics.callHistorySize}`,
      'By Type:',
    ];

    const byType = snapshot.metrics.byType as Record<string, number>;
    Object.entries(byType).forEach(([type, count]) => {
      lines.push(`  ${type}: ${count}`);
    });

    lines.push('By Status:');
    const byStatus = snapshot.metrics.byStatus as Record<string, number>;
    Object.entries(byStatus).forEach(([status, count]) => {
      lines.push(`  ${status}: ${count}`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics for external consumption
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V60-PluginRegistry',
      metrics: {
        ...this.getSnapshot().metrics,
        config: {
          maxPlugins: this.config.maxPlugins,
          autoActivate: this.config.autoActivate,
        },
      },
    };
  }
}

export { DEFAULT_CONFIG };