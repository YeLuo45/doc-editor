/**
 * V118 StreamerExecutor Module
 * Executes streaming operations across multiple streamers
 */

import { Streamer, StreamData } from './Streamer';
import { StreamerRegistry } from './StreamerRegistry';

export interface ExecutorConfig {
  maxConcurrent?: number;
  timeout?: number;
  retryAttempts?: number;
  enableParallel?: boolean;
}

export interface ExecutionResult {
  id: string;
  success: boolean;
  data?: StreamData;
  error?: string;
  duration: number;
}

export interface ExecutorStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
}

type ExecuteCallback = (result: ExecutionResult) => void;

export class StreamerExecutor {
  private registry: StreamerRegistry;
  private config: ExecutorConfig;
  private executionCount: number = 0;
  private successCount: number = 0;
  private totalDuration: number = 0;
  private pendingCallbacks: Map<string, ExecuteCallback[]> = new Map();

  constructor(registry: StreamerRegistry, config: ExecutorConfig = {}) {
    this.registry = registry;
    this.config = {
      maxConcurrent: 10,
      timeout: 5000,
      retryAttempts: 3,
      enableParallel: true,
      ...config,
    };
  }

  get config(): ExecutorConfig {
    return this.config;
  }

  execute(streamerId: string, data: StreamData, callback?: ExecuteCallback): ExecutionResult {
    const streamer = this.registry.get(streamerId);
    const startTime = Date.now();
    
    if (!streamer) {
      const result: ExecutionResult = {
        id: data.id,
        success: false,
        error: `Streamer not found: ${streamerId}`,
        duration: Date.now() - startTime,
      };
      this.trackResult(result);
      return result;
    }

    try {
      streamer.stream(data);
      const result: ExecutionResult = {
        id: data.id,
        success: true,
        data,
        duration: Date.now() - startTime,
      };
      
      if (callback) {
        if (!this.pendingCallbacks.has(data.id)) {
          this.pendingCallbacks.set(data.id, []);
        }
        this.pendingCallbacks.get(data.id)!.push(callback);
      }

      this.trackResult(result);
      return result;
    } catch (e) {
      const result: ExecutionResult = {
        id: data.id,
        success: false,
        error: e instanceof Error ? e.message : String(e),
        duration: Date.now() - startTime,
      };
      this.trackResult(result);
      return result;
    }
  }

  run(streamerIds: string[], data: StreamData[], callback?: ExecuteCallback): ExecutionResult[] {
    const results: ExecutionResult[] = [];
    
    if (this.config.enableParallel) {
      const promises = streamerIds.flatMap(id =>
        data.map(d => this.execute(id, d, callback))
      );
      return promises;
    }

    for (const id of streamerIds) {
      for (const d of data) {
        results.push(this.execute(id, d, callback));
      }
    }
    return results;
  }

  getResults(executionId?: string): ExecutionResult[] {
    if (executionId) {
      const cbs = this.pendingCallbacks.get(executionId);
      return cbs ? [{ id: executionId, success: true, duration: 0 }] : [];
    }
    return [];
  }

  getStats(): ExecutorStats {
    return {
      totalExecutions: this.executionCount,
      successfulExecutions: this.successCount,
      failedExecutions: this.executionCount - this.successCount,
      averageDuration: this.executionCount > 0 ? this.totalDuration / this.executionCount : 0,
    };
  }

  private trackResult(result: ExecutionResult): void {
    this.executionCount++;
    if (result.success) {
      this.successCount++;
    }
    this.totalDuration += result.duration;
  }

  getSnapshot(): { stats: ExecutorStats; pendingCallbacks: number } {
    return {
      stats: this.getStats(),
      pendingCallbacks: this.pendingCallbacks.size,
    };
  }

  reset(): void {
    this.executionCount = 0;
    this.successCount = 0;
    this.totalDuration = 0;
    this.pendingCallbacks.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return `StreamerExecutor Report:
  Total Executions: ${stats.totalExecutions}
  Successful: ${stats.successfulExecutions}
  Failed: ${stats.failedExecutions}
  Avg Duration: ${stats.averageDuration.toFixed(2)}ms
  Config: maxConcurrent=${this.config.maxConcurrent}, timeout=${this.config.timeout}`;
  }

  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: 'V118',
      stats: this.getStats(),
      config: this.config,
    };
  }
}