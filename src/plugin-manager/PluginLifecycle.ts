/**
 * PluginLifecycle.ts - V77 Plugin Lifecycle Manager
 * Manages plugin initialization, start, stop, and destroy states
 */

export type PluginState = 'initialized' | 'started' | 'stopped' | 'destroyed';

export interface LifecycleConfig {
  autoStart: boolean;
  gracefulShutdown: boolean;
  shutdownTimeout: number;
  enableHealthCheck: boolean;
}

export interface PluginLifecycle {
  id: string;
  state: PluginState;
  initializedAt?: number;
  startedAt?: number;
  stoppedAt?: number;
  destroyedAt?: number;
}

type PluginLifecycleConfig = LifecycleConfig;

export class PluginLifecycle {
  private lifecycles: Map<string, PluginLifecycle> = new Map();
  private listeners: Map<string, Array<(state: PluginState) => void>> = new Map();
  
  public readonly config: PluginLifecycleConfig;

  constructor(config: Partial<LifecycleConfig> = {}) {
    this.config = {
      autoStart: config.autoStart ?? true,
      gracefulShutdown: config.gracefulShutdown ?? true,
      shutdownTimeout: config.shutdownTimeout ?? 10000,
      enableHealthCheck: config.enableHealthCheck ?? true,
    };
  }

  /**
   * Initialize a plugin
   */
  init(pluginId: string): boolean {
    if (this.lifecycles.has(pluginId)) {
      return false;
    }

    this.lifecycles.set(pluginId, {
      id: pluginId,
      state: 'initialized',
      initializedAt: Date.now(),
    });

    this.emit(pluginId, 'initialized');
    return true;
  }

  /**
   * Start a plugin
   */
  start(pluginId: string): boolean {
    const lifecycle = this.lifecycles.get(pluginId);
    if (!lifecycle || lifecycle.state === 'destroyed') {
      return false;
    }

    if (lifecycle.state === 'started') {
      return false;
    }

    lifecycle.state = 'started';
    lifecycle.startedAt = Date.now();
    this.emit(pluginId, 'started');
    return true;
  }

  /**
   * Stop a plugin
   */
  stop(pluginId: string): boolean {
    const lifecycle = this.lifecycles.get(pluginId);
    if (!lifecycle || lifecycle.state !== 'started') {
      return false;
    }

    lifecycle.state = 'stopped';
    lifecycle.stoppedAt = Date.now();
    this.emit(pluginId, 'stopped');
    return true;
  }

  /**
   * Destroy a plugin
   */
  destroy(pluginId: string): boolean {
    const lifecycle = this.lifecycles.get(pluginId);
    if (!lifecycle || lifecycle.state === 'destroyed') {
      return false;
    }

    if (lifecycle.state === 'started') {
      this.stop(pluginId);
    }

    lifecycle.state = 'destroyed';
    lifecycle.destroyedAt = Date.now();
    this.emit(pluginId, 'destroyed');
    this.lifecycles.delete(pluginId);
    return true;
  }

  /**
   * Get current state of a plugin
   */
  getState(pluginId: string): PluginState | undefined {
    return this.lifecycles.get(pluginId)?.state;
  }

  /**
   * Get full lifecycle info for a plugin
   */
  getLifecycle(pluginId: string): PluginLifecycle | undefined {
    return this.lifecycles.get(pluginId);
  }

  /**
   * Get all plugins in a specific state
   */
  getPluginsByState(state: PluginState): PluginLifecycle[] {
    return Array.from(this.lifecycles.values()).filter(l => l.state === state);
  }

  /**
   * Add a state change listener
   */
  addListener(pluginId: string, callback: (state: PluginState) => void): void {
    if (!this.listeners.has(pluginId)) {
      this.listeners.set(pluginId, []);
    }
    this.listeners.get(pluginId)!.push(callback);
  }

  /**
   * Emit state change to listeners
   */
  private emit(pluginId: string, state: PluginState): void {
    const callbacks = this.listeners.get(pluginId);
    if (callbacks) {
      callbacks.forEach(cb => cb(state));
    }
  }

  /**
   * Get metrics snapshot
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const lifecycles = Array.from(this.lifecycles.values());
    const stateCounts = {
      initialized: lifecycles.filter(l => l.state === 'initialized').length,
      started: lifecycles.filter(l => l.state === 'started').length,
      stopped: lifecycles.filter(l => l.state === 'stopped').length,
      destroyed: lifecycles.filter(l => l.state === 'destroyed').length,
    };

    return {
      metrics: {
        totalPlugins: this.lifecycles.size,
        ...stateCounts,
        autoStart: this.config.autoStart,
        gracefulShutdown: this.config.gracefulShutdown,
        shutdownTimeout: this.config.shutdownTimeout,
      },
    };
  }

  /**
   * Reset the lifecycle manager
   */
  reset(): void {
    this.lifecycles.clear();
    this.listeners.clear();
  }

  /**
   * Get a report string
   */
  getReport(): string {
    const lifecycles = Array.from(this.lifecycles.values());
    const lines: string[] = [
      '=== Plugin Lifecycle Report ===',
      `Total Plugins: ${this.lifecycles.size}`,
      `Initialized: ${lifecycles.filter(l => l.state === 'initialized').length}`,
      `Started: ${lifecycles.filter(l => l.state === 'started').length}`,
      `Stopped: ${lifecycles.filter(l => l.state === 'stopped').length}`,
      `Destroyed: ${lifecycles.filter(l => l.state === 'destroyed').length}`,
      `Config: autoStart=${this.config.autoStart}, graceful=${this.config.gracefulShutdown}`,
      '--- Plugin Details ---',
    ];

    for (const lifecycle of lifecycles) {
      lines.push(
        `- ${lifecycle.id}: ${lifecycle.state} (init:${lifecycle.initializedAt})`
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