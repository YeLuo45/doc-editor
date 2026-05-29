/**
 * StateMonitor.ts
 * V86 State Monitor Implementation for doc-editor
 * Tracks state metrics and history
 */

export type MonitorConfig = {
  maxHistorySize?: number;
  enableMetricsCollection?: boolean;
  pollingInterval?: number;
  enableAudit?: boolean;
};

export type StateMetric = {
  stateId: string;
  entryCount: number;
  lastEntry: number;
  totalDuration?: number;
};

export type ActiveState = {
  stateId: string;
  startedAt: number;
  data?: Record<string, unknown>;
};

export type StateHistoryEntry = {
  stateId: string;
  stateName: string;
  timestamp: number;
  duration?: number;
  event: 'enter' | 'exit';
};

export class StateMonitor {
  private _config: MonitorConfig;
  private _metrics: Map<string, StateMetric> = new Map();
  private _activeStates: Map<string, ActiveState> = new Map();
  private _history: StateHistoryEntry[] = [];
  private _eventCount: number = 0;

  constructor(config: MonitorConfig = {}) {
    this._config = {
      maxHistorySize: config.maxHistorySize ?? 200,
      enableMetricsCollection: config.enableMetricsCollection ?? true,
      pollingInterval: config.pollingInterval ?? 1000,
      enableAudit: config.enableAudit ?? false,
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  get eventCount(): number {
    return this._eventCount;
  }

  track(stateId: string, stateName: string, event: 'enter' | 'exit', data?: Record<string, unknown>): void {
    const timestamp = Date.now();

    if (event === 'enter') {
      this._activeStates.set(stateId, { stateId, startedAt: timestamp, data });

      const existing = this._metrics.get(stateId);
      if (existing) {
        existing.entryCount++;
        existing.lastEntry = timestamp;
      } else {
        this._metrics.set(stateId, {
          stateId,
          entryCount: 1,
          lastEntry: timestamp,
        });
      }
    } else if (event === 'exit') {
      const active = this._activeStates.get(stateId);
      if (active) {
        const duration = timestamp - active.startedAt;
        const metric = this._metrics.get(stateId);
        if (metric) {
          metric.totalDuration = (metric.totalDuration || 0) + duration;
        }
        this._activeStates.delete(stateId);
      }
    }

    const historyEntry: StateHistoryEntry = {
      stateId,
      stateName,
      timestamp,
      event,
    };
    this._history.push(historyEntry);
    this._eventCount++;

    if (this._history.length > (this._config.maxHistorySize ?? 200)) {
      this._history.shift();
    }

    if (this._config.enableAudit) {
      console.log(`[StateMonitor] ${event.toUpperCase()}: ${stateId} (${stateName})`);
    }
  }

  getMetrics(stateId?: string): StateMetric | StateMetric[] | null {
    if (stateId) {
      const metric = this._metrics.get(stateId);
      return metric ? { ...metric } : null;
    }
    return Array.from(this._metrics.values()).map(m => ({ ...m }));
  }

  getActive(): ActiveState[] {
    return Array.from(this._activeStates.values()).map(s => ({ ...s }));
  }

  getHistory(limit?: number): StateHistoryEntry[] {
    if (limit && limit > 0) {
      return this._history.slice(-limit);
    }
    return [...this._history];
  }

  clearMetrics(): void {
    this._metrics.clear();
    this._eventCount = 0;
  }

  clearHistory(): void {
    this._history = [];
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        trackedStates: this._metrics.size,
        activeStates: this._activeStates.size,
        historySize: this._history.length,
        eventCount: this._eventCount,
        config: this.config,
      },
    };
  }

  reset(): void {
    this._metrics.clear();
    this._activeStates.clear();
    this._history = [];
    this._eventCount = 0;
  }

  getReport(): string {
    const lines = [
      '=== StateMonitor Report ===',
      `Tracked States: ${this._metrics.size}`,
      `Active States: ${this._activeStates.size}`,
      `History Size: ${this._history.length}/${this._config.maxHistorySize}`,
      `Total Events: ${this._eventCount}`,
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

export default StateMonitor;