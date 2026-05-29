/**
 * TransitionManager.ts
 * V86 Transition Manager Implementation for doc-editor
 * Manages state transitions and validation
 */

export type TransitionConfig = {
  allowSelfTransitions?: boolean;
  enableValidation?: boolean;
  maxTransitions?: number;
  enableAudit?: boolean;
};

export type Transition = {
  id: string;
  from: string;
  to: string;
  condition?: (from: string, to: string) => boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

export type TransitionExecution = {
  transitionId: string;
  executedAt: number;
  success: boolean;
  error?: string;
};

export class TransitionManager {
  private _config: TransitionConfig;
  private _transitions: Map<string, Transition> = new Map();
  private _executionHistory: TransitionExecution[] = [];
  private _transitionCount: number = 0;

  constructor(config: TransitionConfig = {}) {
    this._config = {
      allowSelfTransitions: config.allowSelfTransitions ?? true,
      enableValidation: config.enableValidation ?? true,
      maxTransitions: config.maxTransitions ?? 1000,
      enableAudit: config.enableAudit ?? false,
    };
  }

  get config(): TransitionConfig {
    return { ...this._config };
  }

  get size(): number {
    return this._transitions.size;
  }

  add(
    id: string,
    from: string,
    to: string,
    condition?: (from: string, to: string) => boolean,
    metadata?: Record<string, unknown>
  ): boolean {
    if (!id || !from || !to) {
      if (this._config.enableAudit) {
        console.warn('[TransitionManager] Invalid transition: missing required fields');
      }
      return false;
    }

    if (this._transitions.has(id)) {
      if (this._config.enableAudit) {
        console.warn(`[TransitionManager] Transition '${id}' already exists`);
      }
      return false;
    }

    const transition: Transition = {
      id,
      from,
      to,
      condition,
      metadata,
      createdAt: Date.now(),
    };

    this._transitions.set(id, transition);

    if (this._config.enableAudit) {
      console.log(`[TransitionManager] Transition '${id}' (${from} -> ${to}) added`);
    }

    return true;
  }

  execute(id: string, from: string, to: string): { success: boolean; error?: string } {
    if (this._transitions.size >= (this._config.maxTransitions ?? 1000)) {
      return { success: false, error: 'Max transitions limit reached' };
    }

    const transition = this._transitions.get(id);

    if (this._config.enableValidation && !transition) {
      return { success: false, error: `Transition '${id}' not found` };
    }

    if (!this._config.allowSelfTransitions && from === to) {
      return { success: false, error: 'Self-transitions not allowed' };
    }

    if (transition?.condition && !transition.condition(from, to)) {
      const execution: TransitionExecution = {
        transitionId: id,
        executedAt: Date.now(),
        success: false,
        error: 'Condition failed',
      };
      this._executionHistory.push(execution);
      return { success: false, error: 'Transition condition not met' };
    }

    this._transitionCount++;
    const execution: TransitionExecution = {
      transitionId: id,
      executedAt: Date.now(),
      success: true,
    };
    this._executionHistory.push(execution);

    if (this._executionHistory.length > 500) {
      this._executionHistory.shift();
    }

    if (this._config.enableAudit) {
      console.log(`[TransitionManager] Transition '${id}' executed (${from} -> ${to})`);
    }

    return { success: true };
  }

  getTransitions(from?: string, to?: string): Transition[] {
    const result: Transition[] = [];

    this._transitions.forEach(transition => {
      const matchesFrom = !from || transition.from === from;
      const matchesTo = !to || transition.to === to;
      if (matchesFrom && matchesTo) {
        result.push({ ...transition });
      }
    });

    return result;
  }

  getValid(from: string): Transition[] {
    return this.getTransitions(from);
  }

  get(id: string): Transition | null {
    const transition = this._transitions.get(id);
    return transition ? { ...transition } : null;
  }

  remove(id: string): boolean {
    return this._transitions.delete(id);
  }

  clear(): void {
    this._transitions.clear();
    this._executionHistory = [];
    this._transitionCount = 0;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalTransitions: this._transitions.size,
        executionCount: this._transitionCount,
        maxTransitions: this._config.maxTransitions,
        executionHistorySize: this._executionHistory.length,
        allowSelfTransitions: this._config.allowSelfTransitions,
        config: this.config,
      },
    };
  }

  reset(): void {
    this._transitions.clear();
    this._executionHistory = [];
    this._transitionCount = 0;
  }

  getReport(): string {
    const lines = [
      '=== TransitionManager Report ===',
      `Total Transitions: ${this._transitions.size}`,
      `Execution Count: ${this._transitionCount}`,
      `Max Transitions: ${this._config.maxTransitions}`,
      `Execution History: ${this._executionHistory.length}`,
      `Allow Self-Transitions: ${this._config.allowSelfTransitions}`,
      '===============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
      ...this.getSnapshot().metrics,
    };
  }
}

export default TransitionManager;