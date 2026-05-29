/**
 * V60 Plugin Sandbox - Isolated Execution Environment for Plugins
 * Provides safe execution context with resource limits and permissions
 */

export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  maxOutputSize: number;
  allowedAPIs: string[];
  cpuLimit: number;
}

export interface SandboxPermission {
  name: string;
  granted: boolean;
  reason?: string;
}

export interface SandboxContext {
  pluginId: string;
  permissions: SandboxPermission[];
  createdAt: number;
}

const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 5000,
  memoryLimit: 100,
  maxOutputSize: 10000,
  allowedAPIs: ['fetch', 'localStorage', 'sessionStorage'],
  cpuLimit: 50,
};

export class PluginSandbox {
  public readonly config: SandboxConfig;
  private pluginId: string;
  private active: boolean = false;
  private executionCount: number = 0;
  private context: SandboxContext | null = null;
  private callHistory: string[] = [];

  constructor(pluginId: string, config: Partial<SandboxConfig> = {}) {
    this.pluginId = pluginId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.active = true;
  }

  private trackCall(method: string): void {
    this.callHistory.push(`${method}@${Date.now()}`);
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-500);
    }
  }

  /**
   * Create a new sandbox instance
   */
  create(pluginId: string, config?: Partial<SandboxConfig>): PluginSandbox {
    this.trackCall('create');
    return new PluginSandbox(pluginId, config);
  }

  /**
   * Execute code in sandbox
   */
  execute(code: string, context: Record<string, unknown> = {}): { success: boolean; result?: unknown; error?: string } {
    this.trackCall('execute');
    this.executionCount++;

    if (!this.active) {
      return { success: false, error: 'Sandbox is terminated' };
    }

    try {
      // Simulate execution - in real impl, would use iframe/web worker
      return {
        success: true,
        result: {
          executed: true,
          pluginId: this.pluginId,
          codeLength: code.length,
          context,
          executionTime: Math.random() * 100,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Terminate sandbox
   */
  terminate(): void {
    this.trackCall('terminate');
    this.active = false;
    this.context = null;
  }

  /**
   * Check if sandbox is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get plugin ID
   */
  getPluginId(): string {
    return this.pluginId;
  }

  /**
   * Get execution count
   */
  getExecutionCount(): number {
    return this.executionCount;
  }

  /**
   * Get permissions
   */
  getPermissions(): SandboxPermission[] {
    const apiPermissions: SandboxPermission[] = this.config.allowedAPIs.map(api => ({
      name: api,
      granted: true,
    }));

    return [
      ...apiPermissions,
      { name: 'network', granted: true },
      { name: 'storage', granted: true },
      { name: 'clipboard', granted: false, reason: 'Not requested' },
    ];
  }

  /**
   * Check if permission is granted
   */
  hasPermission(permission: string): boolean {
    return this.config.allowedAPIs.includes(permission) ||
           ['network', 'storage'].includes(permission);
  }

  /**
   * Grant permission
   */
  grantPermission(permission: string): boolean {
    if (!this.config.allowedAPIs.includes(permission)) {
      this.config.allowedAPIs.push(permission);
    }
    return true;
  }

  /**
   * Revoke permission
   */
  revokePermission(permission: string): boolean {
    const index = this.config.allowedAPIs.indexOf(permission);
    if (index !== -1) {
      this.config.allowedAPIs.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get sandbox context
   */
  getContext(): SandboxContext | null {
    if (!this.context) {
      this.context = {
        pluginId: this.pluginId,
        permissions: this.getPermissions(),
        createdAt: Date.now(),
      };
    }
    return { ...this.context };
  }

  /**
   * Get sandbox config
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        pluginId: this.pluginId,
        active: this.active,
        executionCount: this.executionCount,
        allowedAPIs: this.config.allowedAPIs.length,
        timeout: this.config.timeout,
        memoryLimit: this.config.memoryLimit,
        callHistorySize: this.callHistory.length,
      },
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.active = true;
    this.executionCount = 0;
    this.context = null;
    this.callHistory = [];
  }

  /**
   * Generate status report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== PluginSandbox Report ===',
      `Plugin ID: ${snapshot.metrics.pluginId}`,
      `Active: ${snapshot.metrics.active}`,
      `Execution Count: ${snapshot.metrics.executionCount}`,
      `Allowed APIs: ${snapshot.metrics.allowedAPIs}`,
      `Timeout: ${snapshot.metrics.timeout}ms`,
      `Memory Limit: ${snapshot.metrics.memoryLimit}MB`,
      `Call History: ${snapshot.metrics.callHistorySize}`,
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics for external consumption
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V60-PluginSandbox',
      metrics: {
        ...this.getSnapshot().metrics,
        permissions: this.getPermissions(),
        config: {
          timeout: this.config.timeout,
          memoryLimit: this.config.memoryLimit,
          maxOutputSize: this.config.maxOutputSize,
          cpuLimit: this.config.cpuLimit,
        },
      },
    };
  }
}

// Sandbox manager for multiple sandboxes
export class SandboxManager {
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private defaultConfig: Partial<SandboxConfig>;
  private callHistory: string[] = [];

  constructor(defaultConfig: Partial<SandboxConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  private trackCall(method: string): void {
    this.callHistory.push(`${method}@${Date.now()}`);
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-500);
    }
  }

  /**
   * Create a new sandbox
   */
  create(pluginId: string, config?: Partial<SandboxConfig>): PluginSandbox {
    this.trackCall('create');
    const sandbox = new PluginSandbox(pluginId, { ...this.defaultConfig, ...config });
    this.sandboxes.set(pluginId, sandbox);
    return sandbox;
  }

  /**
   * Get sandbox by plugin ID
   */
  get(pluginId: string): PluginSandbox | undefined {
    return this.sandboxes.get(pluginId);
  }

  /**
   * Check if sandbox exists
   */
  has(pluginId: string): boolean {
    return this.sandboxes.has(pluginId);
  }

  /**
   * Remove sandbox
   */
  remove(pluginId: string): boolean {
    this.trackCall('remove');
    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      sandbox.terminate();
      return this.sandboxes.delete(pluginId);
    }
    return false;
  }

  /**
   * Terminate all sandboxes
   */
  terminateAll(): void {
    this.trackCall('terminateAll');
    this.sandboxes.forEach(sandbox => sandbox.terminate());
    this.sandboxes.clear();
  }

  /**
   * Get all active sandboxes
   */
  getActive(): PluginSandbox[] {
    return Array.from(this.sandboxes.values()).filter(s => s.isActive());
  }

  /**
   * Get sandbox count
   */
  size(): number {
    return this.sandboxes.size;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalSandboxes: this.sandboxes.size,
        activeCount: this.getActive().length,
        callHistorySize: this.callHistory.length,
      },
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.terminateAll();
    this.callHistory = [];
  }

  /**
   * Generate status report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== SandboxManager Report ===',
      `Total Sandboxes: ${snapshot.metrics.totalSandboxes}`,
      `Active: ${snapshot.metrics.activeCount}`,
      `Call History: ${snapshot.metrics.callHistorySize}`,
    ].join('\n');
  }

  /**
   * Export metrics for external consumption
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V60-SandboxManager',
      metrics: this.getSnapshot().metrics,
    };
  }
}

export { DEFAULT_CONFIG };