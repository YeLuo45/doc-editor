/**
 * V60 Plugin Loader - Dynamic Plugin Loading System
 * Provides dynamic loading, unloading, and plugin state management
 */

import type { PluginMetadata } from '../plugins/types.js';

export interface LoaderConfig {
  basePath: string;
  lazyLoad: boolean;
  preloadDeps: boolean;
  maxConcurrent: number;
}

export interface LoadedPlugin {
  metadata: PluginMetadata;
  module: unknown;
  loadedAt: number;
  loadDuration: number;
  status: 'loading' | 'loaded' | 'failed' | 'unloaded';
  error?: string;
}

const DEFAULT_CONFIG: LoaderConfig = {
  basePath: '/plugins',
  lazyLoad: true,
  preloadDeps: false,
  maxConcurrent: 5,
};

export class PluginLoader {
  public readonly config: LoaderConfig;
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private loadQueue: string[] = [];
  private callHistory: string[] = [];

  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private trackCall(method: string, pluginId?: string): void {
    const entry = pluginId ? `${method}:${pluginId}` : method;
    this.callHistory.push(`${entry}@${Date.now()}`);
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-500);
    }
  }

  /**
   * Load a plugin dynamically
   */
  async load(metadata: PluginMetadata): Promise<boolean> {
    this.trackCall('load', metadata.id);

    if (this.loadedPlugins.has(metadata.id)) {
      const existing = this.loadedPlugins.get(metadata.id)!;
      if (existing.status === 'loaded') {
        return true;
      }
      if (existing.status === 'loading') {
        return false;
      }
    }

    const startTime = performance.now();

    this.loadedPlugins.set(metadata.id, {
      metadata,
      module: null,
      loadedAt: 0,
      loadDuration: 0,
      status: 'loading',
    });

    try {
      // Simulate dynamic loading - in real impl, would use dynamic import()
      await new Promise(resolve => setTimeout(resolve, 10));

      const loadDuration = performance.now() - startTime;

      this.loadedPlugins.set(metadata.id, {
        metadata,
        module: { default: metadata },
        loadedAt: Date.now(),
        loadDuration,
        status: 'loaded',
      });

      return true;
    } catch (error) {
      this.loadedPlugins.set(metadata.id, {
        metadata,
        module: null,
        loadedAt: 0,
        loadDuration: 0,
        status: 'failed',
        error: String(error),
      });
      return false;
    }
  }

  /**
   * Unload a plugin
   */
  unload(pluginId: string): boolean {
    this.trackCall('unload', pluginId);

    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (plugin.status === 'loading') {
      return false; // Cannot unload while loading
    }

    this.loadedPlugins.set(pluginId, {
      ...plugin,
      status: 'unloaded',
    });

    return true;
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    this.trackCall('isLoaded', pluginId);
    const plugin = this.loadedPlugins.get(pluginId);
    return plugin?.status === 'loaded';
  }

  /**
   * Get all loaded plugins
   */
  getLoaded(): LoadedPlugin[] {
    this.trackCall('getLoaded');
    return Array.from(this.loadedPlugins.values()).filter(p => p.status === 'loaded');
  }

  /**
   * Get all loaded plugins including failed/unloaded
   */
  getAllLoaded(): LoadedPlugin[] {
    this.trackCall('getAllLoaded');
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get loaded plugin by ID
   */
  getLoadedPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Get load queue
   */
  getQueue(): string[] {
    return [...this.loadQueue];
  }

  /**
   * Add to load queue
   */
  enqueue(pluginId: string): void {
    if (!this.loadQueue.includes(pluginId)) {
      this.loadQueue.push(pluginId);
    }
  }

  /**
   * Remove from load queue
   */
  dequeue(pluginId: string): boolean {
    const index = this.loadQueue.indexOf(pluginId);
    if (index !== -1) {
      this.loadQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear load queue
   */
  clearQueue(): void {
    this.loadQueue = [];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.loadQueue.length;
  }

  /**
   * Check if plugin is in queue
   */
  isInQueue(pluginId: string): boolean {
    return this.loadQueue.includes(pluginId);
  }

  /**
   * Get failed plugins
   */
  getFailed(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values()).filter(p => p.status === 'failed');
  }

  /**
   * Retry failed plugin
   */
  async retry(pluginId: string): Promise<boolean> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin || plugin.status !== 'failed') {
      return false;
    }

    return this.load(plugin.metadata);
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const plugins = Array.from(this.loadedPlugins.values());
    const byStatus: Record<string, number> = {};

    plugins.forEach(plugin => {
      byStatus[plugin.status] = (byStatus[plugin.status] || 0) + 1;
    });

    return {
      metrics: {
        totalLoaded: this.loadedPlugins.size,
        loadedCount: plugins.filter(p => p.status === 'loaded').length,
        failedCount: plugins.filter(p => p.status === 'failed').length,
        queueSize: this.loadQueue.length,
        byStatus,
        callHistorySize: this.callHistory.length,
      },
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.loadedPlugins.clear();
    this.loadQueue = [];
    this.callHistory = [];
  }

  /**
   * Generate status report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== PluginLoader Report ===',
      `Total Loaded: ${snapshot.metrics.totalLoaded}`,
      `Loaded: ${snapshot.metrics.loadedCount}`,
      `Failed: ${snapshot.metrics.failedCount}`,
      `Queue Size: ${snapshot.metrics.queueSize}`,
      `Call History: ${snapshot.metrics.callHistorySize}`,
      'By Status:',
    ];

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
      version: 'V60-PluginLoader',
      metrics: {
        ...this.getSnapshot().metrics,
        config: {
          basePath: this.config.basePath,
          lazyLoad: this.config.lazyLoad,
          maxConcurrent: this.config.maxConcurrent,
        },
      },
    };
  }
}

export { DEFAULT_CONFIG };