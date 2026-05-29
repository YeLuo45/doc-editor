/**
 * StateMachine.ts
 * V86 State Machine Implementation for doc-editor
 * Manages state transitions and execution flow
 */

export type StateConfig = {
  maxHistory?: number;
  enableLogging?: boolean;
  validationEnabled?: boolean;
};

export type State = {
  id: string;
  name: string;
  data?: Record<string, unknown>;
  timestamp?: number;
};

export type TransitionResult = {
  success: boolean;
  from: string;
  to: string;
  timestamp: number;
  error?: string;
};

export type TransitionCallback = (from: State, to: State) => void | Promise<void>;

export class StateMachine {
  private _config: StateConfig;
  private _currentState: State | null = null;
  private _history: State[] = [];
  private _transitionCallbacks: TransitionCallback[] = [];
  private _transitionCount: number = 0;
  private _errorCount: number = 0;

  constructor(config: StateConfig = {}) {
    this._config = {
      maxHistory: config.maxHistory ?? 100,
      enableLogging: config.enableLogging ?? false,
      validationEnabled: config.validationEnabled ?? true,
    };
  }

  get config(): StateConfig {
    return { ...this._config };
  }

  get currentState(): State | null {
    return this._currentState ? { ...this._currentState } : null;
  }

  get history(): State[] {
    return [...this._history];
  }

  get transitionCount(): number {
    return this._transitionCount;
  }

  transition(stateId: string, stateName: string, data?: Record<string, unknown>): TransitionResult {
    const timestamp = Date.now();
    const fromState = this._currentState;

    if (this._config.validationEnabled && !stateId) {
      return { success: false, from: fromState?.id ?? 'none', to: stateId, timestamp, error: 'Invalid state ID' };
    }

    const newState: State = { id: stateId, name: stateName, data, timestamp };

    if (this._config.enableLogging) {
      console.log(`[StateMachine] Transition: ${fromState?.id ?? 'none'} -> ${stateId}`);
    }

    if (fromState) {
      this._history.push({ ...fromState });
      if (this._history.length > (this._config.maxHistory ?? 100)) {
        this._history.shift();
      }
    }

    this._currentState = newState;
    this._transitionCount++;

    this._transitionCallbacks.forEach(cb => {
      try {
        cb(fromState as State, newState);
      } catch (err) {
        this._errorCount++;
        if (this._config.enableLogging) {
          console.error('[StateMachine] Callback error:', err);
        }
      }
    });

    return { success: true, from: fromState?.id ?? 'none', to: stateId, timestamp };
  }

  execute(action: string, params?: Record<string, unknown>): { success: boolean; result?: unknown; error?: string } {
    if (!this._currentState) {
      return { success: false, error: 'No current state' };
    }

    if (this._config.enableLogging) {
      console.log(`[StateMachine] Execute action: ${action}`, params);
    }

    try {
      const result = { action, state: this._currentState.id, params, timestamp: Date.now() };
      return { success: true, result };
    } catch (err) {
      this._errorCount++;
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  getState(): State | null {
    return this._currentState ? { ...this._currentState } : null;
  }

  getHistory(): State[] {
    return [...this._history];
  }

  onTransition(callback: TransitionCallback): void {
    this._transitionCallbacks.push(callback);
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        currentState: this._currentState?.id ?? null,
        transitionCount: this._transitionCount,
        errorCount: this._errorCount,
        historyLength: this._history.length,
        config: this.config,
      },
    };
  }

  reset(): void {
    this._currentState = null;
    this._history = [];
    this._transitionCount = 0;
    this._errorCount = 0;
    if (this._config.enableLogging) {
      console.log('[StateMachine] Reset performed');
    }
  }

  getReport(): string {
    const lines = [
      '=== StateMachine Report ===',
      `Current State: ${this._currentState?.id ?? 'none'}`,
      `State Name: ${this._currentState?.name ?? 'N/A'}`,
      `Total Transitions: ${this._transitionCount}`,
      `Total Errors: ${this._errorCount}`,
      `History Size: ${this._history.length}/${this._config.maxHistory}`,
      `Config: ${JSON.stringify(this._config)}`,
      '=========================',
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

export default StateMachine;