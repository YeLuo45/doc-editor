/**
 * V60 Plugin Lifecycle - Plugin Lifecycle Hook Management
 * Manages init, start, stop, destroy lifecycle hooks
 */

export type LifecyclePhase = 'init' | 'start' | 'stop' | 'destroy';
export type LifecycleStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

export interface LifecycleHook {
  id: string;
  phase: LifecyclePhase;
  fn: () => Promise<void> | void;
  priority: number;
  timeout: number;
}

export interface LifecycleState {
  phase: LifecyclePhase;
  status: LifecycleStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface LifecycleConfig {
  defaultTimeout: number;
  parallelExecution: boolean;
  continueOnError: boolean;
}

const DEFAULT_CONFIG: LifecycleConfig = {
  defaultTimeout: 5000,
  parallelExecution: false,
  continueOnError: true,
};

export class PluginLifecycle {
  public readonly config: LifecycleConfig;
  private pluginId: string;
  private hooks: Map<LifecyclePhase, LifecycleHook[]> = new Map();
  private state: Map<LifecyclePhase, LifecycleState> = new Map();
  private callHistory: string[] = [];

  constructor(pluginId: string, config: Partial<LifecycleConfig> = {}) {
    this.pluginId = pluginId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeState();
  }

  private initializeState(): void {
    const phases: LifecyclePhase[] = ['init', 'start', 'stop', 'destroy'];
    phases.forEach(phase => {
      this.state.set(phase, { phase, status: 'pending' });
    });
  }

  private trackCall(method: string): void {
    this.callHistory.push(`${method}@${Date.now()}`);
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-500);
    }
  }

  /**
   * Initialize the plugin
   */
  async init(): Promise<boolean> {
    this.trackCall('init');
    return this.executePhase('init');
  }

  /**
   * Start the plugin
   */
  async start(): Promise<boolean> {
    this.trackCall('start');
    return this.executePhase('start');
  }

  /**
   * Stop the plugin
   */
  async stop(): Promise<boolean> {
    this.trackCall('stop');
    return this.executePhase('stop');
  }

  /**
   * Destroy the plugin
   */
  async destroy(): Promise<boolean> {
    this.trackCall('destroy');
    return this.executePhase('destroy');
  }

  /**
   * Execute a lifecycle phase
   */
  private async executePhase(phase: LifecyclePhase): Promise<boolean> {
    const hooks = this.hooks.get(phase) || [];
    if (hooks.length === 0) {
      this.updateState(phase, { status: 'completed' });
      return true;
    }

    this.updateState(phase, { status: 'running', startedAt: Date.now() });

    try {
      const sortedHooks = [...hooks].sort((a, b) => b.priority - a.priority);

      for (const hook of sortedHooks) {
        try {
          const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error(`Hook ${hook.id} timed out`)), hook.timeout)
          );
          await Promise.race([hook.fn(), timeoutPromise]);
        } catch (error) {
          if (!this.config.continueOnError) {
            this.updateState(phase, { status: 'failed', error: String(error) });
            return false;
          }
        }
      }

      this.updateState(phase, { status: 'completed', completedAt: Date.now() });
      return true;
    } catch (error) {
      this.updateState(phase, { status: 'failed', error: String(error) });
      return false;
    }
  }

  /**
   * Update lifecycle state for a phase
   */
  private updateState(phase: LifecyclePhase, updates: Partial<LifecycleState>): void {
    const current = this.state.get(phase);
    if (current) {
      this.state.set(phase, { ...current, ...updates });
    }
  }

  /**
   * Register a lifecycle hook
   */
  register(hook: Omit<LifecycleHook, 'id'>): string {
    this.trackCall('register');
    const id = `hook_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const fullHook: LifecycleHook = {
      ...hook,
      id,
      timeout: hook.timeout || this.config.defaultTimeout,
    };

    const phaseHooks = this.hooks.get(hook.phase) || [];
    phaseHooks.push(fullHook);
    this.hooks.set(hook.phase, phaseHooks);

    return id;
  }

  /**
   * Unregister a lifecycle hook
   */
  unregister(hookId: string): boolean {
    this.trackCall('unregister');

    for (const [phase, hooks] of this.hooks.entries()) {
      const index = hooks.findIndex(h => h.id === hookId);
      if (index !== -1) {
        hooks.splice(index, 1);
        this.hooks.set(phase, hooks);
        return true;
      }
    }
    return false;
  }

  /**
   * Get hooks for a phase
   */
  getHooks(phase: LifecyclePhase): LifecycleHook[] {
    return this.hooks.get(phase) || [];
  }

  /**
   * Get lifecycle state for a phase
   */
  getState(phase: LifecyclePhase): LifecycleState | undefined {
    return this.state.get(phase);
  }

  /**
   * Get all states
   */
  getAllStates(): LifecycleState[] {
    return Array.from(this.state.values());
  }

  /**
   * Check if plugin is in a given state
   */
  isInState(phase: LifecyclePhase, status: LifecycleStatus): boolean {
    const state = this.state.get(phase);
    return state?.status === status;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): LifecyclePhase | null {
    for (const [phase, state] of this.state.entries()) {
      if (state.status === 'running') {
        return phase;
      }
    }
    // Return most advanced completed phase
    const order: LifecyclePhase[] = ['init', 'start', 'stop', 'destroy'];
    for (let i = order.length - 1; i >= 0; i--) {
      const state = this.state.get(order[i]);
      if (state?.status === 'completed') {
        return order[i];
      }
    }
    return null;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const states = Array.from(this.state.values());
    const byStatus: Record<string, number> = {};

    states.forEach(state => {
      byStatus[state.status] = (byStatus[state.status] || 0) + 1;
    });

    let totalHooks = 0;
    this.hooks.forEach(hooks => {
      totalHooks += hooks.length;
    });

    return {
      metrics: {
        pluginId: this.pluginId,
        currentPhase: this.getCurrentPhase(),
        totalHooks,
        byStatus,
        callHistorySize: this.callHistory.length,
      },
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.hooks.clear();
    this.initializeState();
    this.callHistory = [];
  }

  /**
   * Generate status report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== PluginLifecycle Report ===',
      `Plugin ID: ${snapshot.metrics.pluginId}`,
      `Current Phase: ${snapshot.metrics.currentPhase}`,
      `Total Hooks: ${snapshot.metrics.totalHooks}`,
      `Call History: ${snapshot.metrics.callHistorySize}`,
      'State by Phase:',
    ];

    const phases: LifecyclePhase[] = ['init', 'start', 'stop', 'destroy'];
    phases.forEach(phase => {
      const state = this.state.get(phase);
      if (state) {
        lines.push(`  ${phase}: ${state.status}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Export metrics for external consumption
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V60-PluginLifecycle',
      metrics: {
        ...this.getSnapshot().metrics,
        config: {
          defaultTimeout: this.config.defaultTimeout,
          parallelExecution: this.config.parallelExecution,
          continueOnError: this.config.continueOnError,
        },
      },
    };
  }
}

export { DEFAULT_CONFIG };