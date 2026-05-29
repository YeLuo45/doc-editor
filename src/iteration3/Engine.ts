/**
 * Engine.ts - Core engine module for doc-editor V33 Iteration 3
 * Handles core engine operations with start/stop/getState
 */

export interface EngineState {
  status: 'stopped' | 'running' | 'paused';
  startTime?: number;
  uptime: number;
  operationsCount: number;
  currentOperation?: string;
}

export interface EngineMetrics {
  totalOperations: number;
  totalErrors: number;
  averageOperationTime: number;
  peakConcurrency: number;
  successRate: number;
}

export interface EngineSnapshot {
  state: EngineState;
  metrics: EngineMetrics;
  timestamp: number;
}

export interface EngineReport {
  status: 'stopped' | 'running' | 'paused' | 'error';
  state: EngineState;
  metrics: EngineMetrics;
  health: number;
  uptimeFormatted: string;
}

export interface EngineExportedMetrics {
  timestamp: number;
  metrics: EngineMetrics;
  version: string;
  exportVersion: string;
}

export class Engine {
  private state: EngineState = {
    status: 'stopped',
    uptime: 0,
    operationsCount: 0,
  };
  private metrics: EngineMetrics = {
    totalOperations: 0,
    totalErrors: 0,
    averageOperationTime: 0,
    peakConcurrency: 0,
    successRate: 100,
  };
  private currentConcurrency = 0;
  private startTime?: number;
  private operationHistory: Array<{ name: string; duration: number; success: boolean }> = [];

  /**
   * Start the engine
   */
  start(operationName?: string): EngineState {
    if (this.state.status === 'running') {
      return this.state;
    }

    this.startTime = Date.now();
    this.state = {
      status: 'running',
      startTime: this.startTime,
      uptime: 0,
      operationsCount: 0,
      currentOperation: operationName,
    };

    this.runUptimeTracker();
    return this.state;
  }

  /**
   * Stop the engine
   */
  stop(): EngineState {
    if (this.state.status === 'stopped') {
      return this.state;
    }

    const finalUptime = this.startTime ? Date.now() - this.startTime : 0;
    this.state = {
      status: 'stopped',
      uptime: finalUptime,
      operationsCount: this.metrics.totalOperations,
    };

    this.startTime = undefined;
    this.currentConcurrency = 0;
    return this.state;
  }

  /**
   * Get the current engine state
   */
  getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Execute an operation
   */
  execute(operationName: string, fn: () => unknown): unknown {
    if (this.state.status !== 'running') {
      throw new Error('Engine is not running');
    }

    this.currentConcurrency++;
    if (this.currentConcurrency > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.currentConcurrency;
    }

    this.state.currentOperation = operationName;
    const startTime = Date.now();

    try {
      const result = fn();
      const duration = Date.now() - startTime;

      this.metrics.totalOperations++;
      this.operationHistory.push({ name: operationName, duration, success: true });
      this.updateAverageOperationTime();
      this.updateSuccessRate();

      this.state.operationsCount = this.metrics.totalOperations;
      this.currentConcurrency--;

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.totalOperations++;
      this.metrics.totalErrors++;
      this.operationHistory.push({ name: operationName, duration, success: false });
      this.updateAverageOperationTime();
      this.updateSuccessRate();

      this.state.operationsCount = this.metrics.totalOperations;
      this.currentConcurrency--;

      throw error;
    }
  }

  /**
   * Get a snapshot of current engine state
   */
  getSnapshot(): EngineSnapshot {
    return {
      state: { ...this.state },
      metrics: { ...this.metrics },
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all state and metrics
   */
  reset(): void {
    this.state = {
      status: 'stopped',
      uptime: 0,
      operationsCount: 0,
    };
    this.metrics = {
      totalOperations: 0,
      totalErrors: 0,
      averageOperationTime: 0,
      peakConcurrency: 0,
      successRate: 100,
    };
    this.currentConcurrency = 0;
    this.startTime = undefined;
    this.operationHistory = [];
  }

  /**
   * Generate a detailed status report
   */
  getReport(): EngineReport {
    const health = this.calculateHealth();

    return {
      status: this.metrics.totalErrors > 0 && this.state.status === 'running' ? 'error' : this.state.status,
      state: { ...this.state },
      metrics: { ...this.metrics },
      health,
      uptimeFormatted: this.formatUptime(this.state.uptime),
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): EngineExportedMetrics {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V33-I3',
    };
  }

  private runUptimeTracker(): void {
    setInterval(() => {
      if (this.state.status === 'running' && this.startTime) {
        this.state.uptime = Date.now() - this.startTime;
      }
    }, 100);
  }

  private updateAverageOperationTime(): void {
    const total = this.operationHistory.length;
    if (total > 0) {
      const sum = this.operationHistory.reduce((acc, op) => acc + op.duration, 0);
      this.metrics.averageOperationTime = sum / total;
    }
  }

  private updateSuccessRate(): void {
    const total = this.metrics.totalOperations;
    if (total > 0) {
      this.metrics.successRate = ((total - this.metrics.totalErrors) / total) * 100;
    }
  }

  private calculateHealth(): number {
    let health = 100;
    if (this.metrics.successRate < 90) health -= 20;
    if (this.metrics.successRate < 70) health -= 30;
    if (this.currentConcurrency > 5) health -= 10;
    if (this.metrics.totalErrors > 10) health -= 25;
    return Math.max(0, health);
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
}

export default Engine;