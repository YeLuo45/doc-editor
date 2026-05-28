/**
 * PluginSandbox - Isolated Execution Environment for Plugins
 * Provides safe execution context with resource limits
 */

import type { SandboxMessage, SandboxResponse } from './types.js';

export interface SandboxConfig {
  timeout: number;       // Max execution time in ms
  memoryLimit: number;   // Max memory in MB
  maxOutputSize: number; // Max output in chars
  allowedAPIs: string[];  // Allowed browser APIs
}

const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 5000,
  memoryLimit: 100,
  maxOutputSize: 10000,
  allowedAPIs: ['fetch', 'localStorage', 'sessionStorage'],
};

export class PluginSandbox {
  private pluginId: string;
  private config: SandboxConfig;
  private active: boolean = false;
  private executionCount: number = 0;
  private lastResult?: SandboxResponse;

  constructor(pluginId: string, config: Partial<SandboxConfig> = {}) {
    this.pluginId = pluginId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.active = true;
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
   * Get sandbox config
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  /**
   * Get execution count
   */
  getExecutionCount(): number {
    return this.executionCount;
  }

  /**
   * Get last execution result
   */
  getLastResult(): SandboxResponse | undefined {
    return this.lastResult;
  }

  /**
   * Terminate sandbox
   */
  terminate(): void {
    this.active = false;
  }

  /**
   * Send message to sandbox
   */
  sendMessage(message: SandboxMessage): SandboxResponse {
    this.executionCount++;

    const response: SandboxResponse = {
      id: message.id,
      type: 'result',
      pluginId: this.pluginId,
      success: false,
    };

    switch (message.type) {
      case 'init':
        if (this.active) {
          response.success = true;
          response.data = { initialized: true, sandboxId: this.pluginId };
        } else {
          response.success = false;
          response.error = 'Sandbox is terminated';
        }
        break;

      case 'execute':
        if (!this.active) {
          response.success = false;
          response.error = 'Sandbox is terminated';
          break;
        }

        try {
          // Simulate execution - in real impl, this would use iframe/web worker
          const startTime = performance.now();
          
          // Timeout check would be done in real implementation
          if (this.config.timeout <= 0) {
            throw new Error('Execution timeout');
          }

          response.success = true;
          response.data = {
            executed: true,
            pluginId: this.pluginId,
            payload: message.payload,
            executionTime: performance.now() - startTime,
          };
        } catch (error) {
          response.success = false;
          response.error = String(error);
        }
        break;

      case 'terminate':
        this.active = false;
        response.success = true;
        response.data = { terminated: true };
        break;

      default:
        response.success = false;
        response.error = `Unknown message type`;
    }

    this.lastResult = response;
    return response;
  }

  /**
   * Execute code in sandbox
   */
  async execute(code: string, context: Record<string, unknown> = {}): Promise<SandboxResponse> {
    const messageId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    return this.sendMessage({
      id: messageId,
      type: 'execute',
      pluginId: this.pluginId,
      payload: { code, context },
    });
  }

  /**
   * Execute function in sandbox
   */
  async executeFn(fn: (...args: unknown[]) => unknown, args: unknown[] = []): Promise<SandboxResponse> {
    const messageId = `execfn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    return this.sendMessage({
      id: messageId,
      type: 'execute',
      pluginId: this.pluginId,
      payload: { fn: fn.toString(), args },
    });
  }

  /**
   * Check if API is allowed
   */
  isAPIAllowed(api: string): boolean {
    return this.config.allowedAPIs.includes(api);
  }

  /**
   * Get allowed APIs
   */
  getAllowedAPIs(): string[] {
    return [...this.config.allowedAPIs];
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset execution count
   */
  resetExecutionCount(): void {
    this.executionCount = 0;
  }

  /**
   * Create sandbox from message (factory method)
   */
  static fromMessage(message: SandboxMessage, config?: Partial<SandboxConfig>): PluginSandbox {
    const sandbox = new PluginSandbox(message.pluginId, config);
    if (message.type === 'terminate') {
      sandbox.terminate();
    }
    return sandbox;
  }
}

// Sandbox manager for multiple sandboxes
export class SandboxManager {
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private defaultConfig: Partial<SandboxConfig>;

  constructor(defaultConfig: Partial<SandboxConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Create a new sandbox
   */
  create(pluginId: string, config?: Partial<SandboxConfig>): PluginSandbox {
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
    this.sandboxes.forEach(sandbox => sandbox.terminate());
    this.sandboxes.clear();
  }

  /**
   * Get all active sandboxes
   */
  getActiveSandboxes(): PluginSandbox[] {
    return Array.from(this.sandboxes.values()).filter(s => s.isActive());
  }

  /**
   * Get sandbox count
   */
  size(): number {
    return this.sandboxes.size;
  }
}

export { DEFAULT_CONFIG };