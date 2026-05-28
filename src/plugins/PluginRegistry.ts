/**
 * PluginRegistry - Plugin Registration and Management
 * Manages plugin lifecycle: register, activate, deactivate, execute
 */

import type {
  PluginMetadata,
  PluginType,
  PluginInstance,
  PluginStatus,
  PluginInput,
  PluginOutput,
  PluginFeatureFlag,
} from './types.js';

const STORAGE_PREFIX = 'doc-editor-plugins-';
const STORAGE_KEY = `${STORAGE_PREFIX}registry`;

interface PluginEntry {
  instance: PluginInstance;
  config: Record<string, unknown>;
  enabled: boolean;
  priority: number;
}

export class PluginRegistry {
  private plugins: Map<string, PluginEntry> = new Map();
  private featureFlags: Map<string, PluginFeatureFlag> = new Map();
  private activeSandboxes: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load registry from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, PluginEntry>;
        Object.entries(parsed).forEach(([id, entry]) => {
          this.plugins.set(id, entry);
        });
      }
    } catch {
      this.plugins.clear();
    }
  }

  /**
   * Save registry to localStorage
   */
  private saveToStorage(): void {
    const data: Record<string, PluginEntry> = {};
    this.plugins.forEach((entry, id) => {
      data[id] = entry;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Register a new plugin
   */
  register(metadata: PluginMetadata, config: Record<string, unknown> = {}): void {
    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin ${metadata.id} already registered`);
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
    });

    this.saveToStorage();
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    if (!this.plugins.has(pluginId)) {
      return false;
    }

    this.plugins.delete(pluginId);
    this.featureFlags.delete(pluginId);
    this.activeSandboxes.delete(pluginId);
    this.saveToStorage();
    return true;
  }

  /**
   * Get plugin metadata
   */
  get(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId)?.instance.metadata;
  }

  /**
   * Get plugin instance (includes status)
   */
  getInstance(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId)?.instance;
  }

  /**
   * Get plugin config
   */
  getConfig(pluginId: string): Record<string, unknown> | undefined {
    return this.plugins.get(pluginId)?.config;
  }

  /**
   * Get all registered plugins
   */
  list(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(entry => entry.instance.metadata);
  }

  /**
   * Get all plugin instances with status
   */
  listWithStatus(): PluginInstance[] {
    return Array.from(this.plugins.values()).map(entry => entry.instance);
  }

  /**
   * Find plugins by type
   */
  findByType(type: PluginType): PluginMetadata[] {
    return this.list().filter(p => p.type === type);
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
   * Activate a plugin
   */
  activate(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.instance.status = 'activated';
    this.saveToStorage();
    return true;
  }

  /**
   * Deactivate a plugin
   */
  deactivate(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.instance.status = 'deactivated';
    this.activeSandboxes.delete(pluginId);
    this.saveToStorage();
    return true;
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  /**
   * Enable a plugin
   */
  enable(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.enabled = true;
    this.saveToStorage();
    return true;
  }

  /**
   * Disable a plugin
   */
  disable(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.enabled = false;
    this.saveToStorage();
    return true;
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
    this.saveToStorage();
    return true;
  }

  /**
   * Get plugin priority
   */
  getPriority(pluginId: string): number {
    return this.plugins.get(pluginId)?.priority ?? 0;
  }

  /**
   * Get plugins by status
   */
  getByStatus(status: PluginStatus): PluginInstance[] {
    return this.listWithStatus().filter(p => p.status === status);
  }

  /**
   * Set plugin status
   */
  setStatus(pluginId: string, status: PluginStatus, error?: string): boolean {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return false;
    }

    entry.instance.status = status;
    if (error) {
      entry.instance.lastError = error;
    }
    this.saveToStorage();
    return true;
  }

  /**
   * Get plugin status
   */
  getStatus(pluginId: string): PluginStatus | undefined {
    return this.plugins.get(pluginId)?.instance.status;
  }

  /**
   * Execute a plugin (for tool-type plugins)
   */
  async execute(pluginId: string, input: PluginInput): Promise<PluginOutput> {
    const startTime = performance.now();
    const entry = this.plugins.get(pluginId);

    if (!entry) {
      return {
        success: false,
        error: `Plugin ${pluginId} not found`,
        duration: performance.now() - startTime,
      };
    }

    if (!entry.enabled) {
      return {
        success: false,
        error: `Plugin ${pluginId} is disabled`,
        duration: performance.now() - startTime,
      };
    }

    if (entry.instance.status !== 'activated') {
      return {
        success: false,
        error: `Plugin ${pluginId} is not activated`,
        duration: performance.now() - startTime,
      };
    }

    // Simulate plugin execution - in real impl, this would call plugin code
    try {
      // Placeholder for actual plugin execution
      const result = {
        success: true,
        data: { pluginId, input },
      };

      return {
        ...result,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      entry.instance.status = 'error';
      entry.instance.lastError = String(error);
      this.saveToStorage();

      return {
        success: false,
        error: String(error),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Track active sandbox
   */
  addSandbox(pluginId: string): void {
    this.activeSandboxes.add(pluginId);
  }

  /**
   * Remove sandbox tracking
   */
  removeSandbox(pluginId: string): void {
    this.activeSandboxes.delete(pluginId);
  }

  /**
   * Check if plugin has active sandbox
   */
  hasSandbox(pluginId: string): boolean {
    return this.activeSandboxes.has(pluginId);
  }

  /**
   * Get all active sandboxes
   */
  getActiveSandboxes(): string[] {
    return Array.from(this.activeSandboxes);
  }

  /**
   * Set feature flag for plugin
   */
  setFeatureFlag(pluginId: string, flag: PluginFeatureFlag): void {
    this.featureFlags.set(pluginId, flag);
  }

  /**
   * Get feature flag for plugin
   */
  getFeatureFlag(pluginId: string): PluginFeatureFlag | undefined {
    return this.featureFlags.get(pluginId);
  }

  /**
   * Check if feature is enabled for plugin (considering rollout %)
   */
  isFeatureEnabled(pluginId: string): boolean {
    const flag = this.featureFlags.get(pluginId);
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rollout >= 100) {
      return true;
    }
    if (flag.rollout <= 0) {
      return false;
    }

    return Math.random() * 100 < flag.rollout;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.featureFlags.clear();
    this.activeSandboxes.clear();
    this.saveToStorage();
  }
}

// Singleton instance
let registryInstance: PluginRegistry | null = null;

export function getPluginRegistry(): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry();
  }
  return registryInstance;
}

export function resetPluginRegistry(): void {
  registryInstance = null;
}

export { STORAGE_KEY, STORAGE_PREFIX };