/**
 * PluginRegistry.ts - V77 Plugin Registry
 * Manages plugin registration, unregistration, and enable/disable states
 */

export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface RegistryConfig {
  autoEnable: boolean;
  allowDuplicate: boolean;
  maxPlugins: number;
}

type PluginRegistryConfig = RegistryConfig;

export class PluginRegistry {
  private plugins: Map<string, PluginConfig> = new Map();
  private enabledPlugins: Set<string> = new Set();
  
  public readonly config: PluginRegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      autoEnable: config.autoEnable ?? true,
      allowDuplicate: config.allowDuplicate ?? false,
      maxPlugins: config.maxPlugins ?? 100,
    };
  }

  /**
   * Register a new plugin
   */
  register(plugin: PluginConfig): boolean {
    if (this.plugins.size >= this.config.maxPlugins) {
      return false;
    }

    if (this.plugins.has(plugin.id) && !this.config.allowDuplicate) {
      return false;
    }

    this.plugins.set(plugin.id, { ...plugin, enabled: false });

    if (this.config.autoEnable) {
      this.enable(plugin.id);
    }

    return true;
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    this.enabledPlugins.delete(pluginId);
    return this.plugins.delete(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID
   */
  getPlugin(pluginId: string): PluginConfig | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Enable a plugin
   */
  enable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.enabled = true;
    this.enabledPlugins.add(pluginId);
    return true;
  }

  /**
   * Disable a plugin
   */
  disable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.enabled = false;
    this.enabledPlugins.delete(pluginId);
    return true;
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): PluginConfig[] {
    return this.getPlugins().filter(p => this.enabledPlugins.has(p.id));
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalPlugins: this.plugins.size,
        enabledPlugins: this.enabledPlugins.size,
        disabledPlugins: this.plugins.size - this.enabledPlugins.size,
        autoEnable: this.config.autoEnable,
        maxPlugins: this.config.maxPlugins,
      },
    };
  }

  /**
   * Reset the registry to initial state
   */
  reset(): void {
    this.plugins.clear();
    this.enabledPlugins.clear();
  }

  /**
   * Get a report string
   */
  getReport(): string {
    const lines: string[] = [
      '=== Plugin Registry Report ===',
      `Total Plugins: ${this.plugins.size}`,
      `Enabled: ${this.enabledPlugins.size}`,
      `Disabled: ${this.plugins.size - this.enabledPlugins.size}`,
      `Config: autoEnable=${this.config.autoEnable}, maxPlugins=${this.config.maxPlugins}`,
      '--- Plugin Details ---',
    ];

    for (const plugin of this.plugins.values()) {
      lines.push(
        `- ${plugin.id} (${plugin.name} v${plugin.version}) [${plugin.enabled ? 'ENABLED' : 'DISABLED'}]`
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