/**
 * PluginLoader.ts - V77 Plugin Loader
 * Manages plugin loading, unloading, and retrieval of loaded plugins
 */

export interface LoadedPlugin {
  id: string;
  name: string;
  version: string;
  loadedAt: number;
  source: string;
  status: 'loaded' | 'failed' | 'unloaded';
}

export interface LoaderConfig {
  basePath: string;
  timeout: number;
  retryAttempts: number;
  enableCaching: boolean;
}

type PluginLoaderConfig = LoaderConfig;

export class PluginLoader {
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private pluginSources: Map<string, string> = new Map();
  
  public readonly config: PluginLoaderConfig;

  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = {
      basePath: config.basePath ?? '/plugins',
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      enableCaching: config.enableCaching ?? true,
    };
  }

  /**
   * Load a plugin from source
   */
  load(id: string, name: string, version: string, source: string): boolean {
    if (this.loadedPlugins.has(id)) {
      return false;
    }

    const plugin: LoadedPlugin = {
      id,
      name,
      version,
      loadedAt: Date.now(),
      source,
      status: 'loaded',
    };

    this.loadedPlugins.set(id, plugin);
    this.pluginSources.set(id, source);
    return true;
  }

  /**
   * Unload a plugin
   */
  unload(pluginId: string): boolean {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.status = 'unloaded';
    this.loadedPlugins.delete(pluginId);
    this.pluginSources.delete(pluginId);
    return true;
  }

  /**
   * Get all loaded plugins
   */
  getLoaded(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values()).filter(
      p => p.status === 'loaded'
    );
  }

  /**
   * Get plugin info by ID
   */
  getInfo(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Get plugin source
   */
  getSource(pluginId: string): string | undefined {
    return this.pluginSources.get(pluginId);
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    const plugin = this.loadedPlugins.get(pluginId);
    return plugin?.status === 'loaded';
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    totalLoaded: number;
    totalFailed: number;
    totalUnloaded: number;
    cacheEnabled: boolean;
  } {
    const plugins = Array.from(this.loadedPlugins.values());
    return {
      totalLoaded: plugins.filter(p => p.status === 'loaded').length,
      totalFailed: plugins.filter(p => p.status === 'failed').length,
      totalUnloaded: plugins.filter(p => p.status === 'unloaded').length,
      cacheEnabled: this.config.enableCaching,
    };
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        ...this.getStats(),
        basePath: this.config.basePath,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
      },
    };
  }

  /**
   * Reset the loader
   */
  reset(): void {
    this.loadedPlugins.clear();
    this.pluginSources.clear();
  }

  /**
   * Get a report string
   */
  getReport(): string {
    const lines: string[] = [
      '=== Plugin Loader Report ===',
      `Loaded: ${this.getStats().totalLoaded}`,
      `Failed: ${this.getStats().totalFailed}`,
      `Unloaded: ${this.getStats().totalUnloaded}`,
      `Config: basePath=${this.config.basePath}, cache=${this.config.enableCaching}`,
      '--- Loaded Plugins ---',
    ];

    for (const plugin of this.loadedPlugins.values()) {
      lines.push(
        `- ${plugin.id} (${plugin.name} v${plugin.version}) [${plugin.status}]`
      );
    }

    return lines.join('\n');
  }

  /**
   * Export metrics for monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}