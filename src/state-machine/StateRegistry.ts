/**
 * StateRegistry.ts
 * V86 State Registry Implementation for doc-editor
 * Manages state registration and lookup
 */

export type RegistryConfig = {
  allowOverwrite?: boolean;
  maxEntries?: number;
  enableAudit?: boolean;
};

export type RegisteredState = {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
  registeredAt: number;
  updatedAt?: number;
};

export class StateRegistry {
  private _config: RegistryConfig;
  private _states: Map<string, RegisteredState> = new Map();
  private _registrationOrder: string[] = [];
  private _updateCount: number = 0;
  private _lookupCount: number = 0;

  constructor(config: RegistryConfig = {}) {
    this._config = {
      allowOverwrite: config.allowOverwrite ?? false,
      maxEntries: config.maxEntries ?? 500,
      enableAudit: config.enableAudit ?? false,
    };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  get size(): number {
    return this._states.size;
  }

  register(id: string, name: string, metadata?: Record<string, unknown>): boolean {
    const timestamp = Date.now();

    if (!id || !name) {
      if (this._config.enableAudit) {
        console.warn('[StateRegistry] Registration failed: missing id or name');
      }
      return false;
    }

    if (this._states.has(id)) {
      if (!this._config.allowOverwrite) {
        if (this._config.enableAudit) {
          console.warn(`[StateRegistry] State '${id}' already exists, overwrite disabled`);
        }
        return false;
      }
      const existing = this._states.get(id)!;
      existing.name = name;
      existing.metadata = metadata;
      existing.updatedAt = timestamp;
      this._updateCount++;
      if (this._config.enableAudit) {
        console.log(`[StateRegistry] State '${id}' updated`);
      }
      return true;
    }

    if (this._states.size >= (this._config.maxEntries ?? 500)) {
      if (this._config.enableAudit) {
        console.warn('[StateRegistry] Max entries reached, cannot register new state');
      }
      return false;
    }

    const state: RegisteredState = {
      id,
      name,
      metadata,
      registeredAt: timestamp,
    };

    this._states.set(id, state);
    this._registrationOrder.push(id);

    if (this._config.enableAudit) {
      console.log(`[StateRegistry] State '${id}' registered successfully`);
    }

    return true;
  }

  add(id: string, name: string, metadata?: Record<string, unknown>): boolean {
    return this.register(id, name, metadata);
  }

  remove(id: string): boolean {
    const existed = this._states.has(id);
    if (existed) {
      this._states.delete(id);
      this._registrationOrder = this._registrationOrder.filter(sid => sid !== id);
      if (this._config.enableAudit) {
        console.log(`[StateRegistry] State '${id}' removed`);
      }
    }
    return existed;
  }

  get(id: string): RegisteredState | null {
    this._lookupCount++;
    const state = this._states.get(id);
    return state ? { ...state } : null;
  }

  getAll(): RegisteredState[] {
    return this._registrationOrder.map(id => {
      const state = this._states.get(id);
      return state ? { ...state } : null;
    }).filter((s): s is RegisteredState => s !== null);
  }

  has(id: string): boolean {
    return this._states.has(id);
  }

  clear(): void {
    this._states.clear();
    this._registrationOrder = [];
    this._updateCount = 0;
    if (this._config.enableAudit) {
      console.log('[StateRegistry] All states cleared');
    }
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalStates: this._states.size,
        maxEntries: this._config.maxEntries,
        registrationOrder: [...this._registrationOrder],
        updateCount: this._updateCount,
        lookupCount: this._lookupCount,
        config: this.config,
      },
    };
  }

  reset(): void {
    this._states.clear();
    this._registrationOrder = [];
    this._updateCount = 0;
    this._lookupCount = 0;
  }

  getReport(): string {
    const lines = [
      '=== StateRegistry Report ===',
      `Total States: ${this._states.size}`,
      `Max Entries: ${this._config.maxEntries}`,
      `Update Count: ${this._updateCount}`,
      `Lookup Count: ${this._lookupCount}`,
      `Allow Overwrite: ${this._config.allowOverwrite}`,
      `Registered IDs: ${this._registrationOrder.join(', ') || 'none'}`,
      '============================',
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

export default StateRegistry;