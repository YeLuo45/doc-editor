/**
 * V119 SerializerExecutor Module
 * Executes serialization operations across multiple serializers
 */

import { Serializer, SerializedData } from './Serializer';
import { SerializerRegistry } from './SerializerRegistry';

export interface ExecutorConfig {
  maxConcurrent?: number;
  timeout?: number;
  retryAttempts?: number;
  enableParallel?: boolean;
}

export interface ExecutionResult {
  id: string;
  success: boolean;
  data?: SerializedData;
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

export class SerializerExecutor {
  private registry: SerializerRegistry;
  private config: ExecutorConfig;
  private executionCount: number = 0;
  private successCount: number = 0;
  private totalDuration: number = 0;
  private pendingCallbacks: Map<string, ExecuteCallback[]> = new Map();
  private executionResults: ExecutionResult[] = [];

  constructor(registry: SerializerRegistry, config: ExecutorConfig = {}) {
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

  execute(serializerId: string, payload: unknown, metadata?: Record<string, unknown>, callback?: ExecuteCallback): ExecutionResult {
    const serializer = this.registry.get(serializerId);
    const startTime = Date.now();

    if (!serializer) {
      const result: ExecutionResult = {
        id: `${Date.now()}-${Math.random()}`,
        success: false,
        error: `Serializer not found: ${serializerId}`,
        duration: Date.now() - startTime,
      };
      this.trackResult(result);
      return result;
    }

    try {
      const serialized = serializer.serialize(`${Date.now()}`, payload, metadata);
      const result: ExecutionResult = {
        id: serialized.id,
        success: true,
        data: serialized,
        duration: Date.now() - startTime,
      };

      if (callback) {
        if (!this.pendingCallbacks.has(serialized.id)) {
          this.pendingCallbacks.set(serialized.id, []);
        }
        this.pendingCallbacks.get(serialized.id)!.push(callback);
      }

      this.trackResult(result);
      this.executionResults.push(result);
      return result;
    } catch (e) {
      const result: ExecutionResult = {
        id: `${Date.now()}-${Math.random()}`,
        success: false,
        error: e instanceof Error ? e.message : String(e),
        duration: Date.now() - startTime,
      };
      this.trackResult(result);
      this.executionResults.push(result);
      return result;
    }
  }

  run(serializerIds: string[], payloads: unknown[], callback?: ExecuteCallback): ExecutionResult[] {
    const results: ExecutionResult[] = [];

    if (this.config.enableParallel) {
      return serializerIds.flatMap(id =>
        payloads.map(p => this.execute(id, p, undefined, callback))
      );
    }

    for (const id of serializerIds) {
      for (const p of payloads) {
        results.push(this.execute(id, p, undefined, callback));
      }
    }
    return results;
  }

  getResults(executionId?: string): ExecutionResult[] {
    if (executionId) {
      return this.executionResults.filter(r => r.id === executionId);
    }
    return [...this.executionResults];
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

  getSnapshot(): { stats: ExecutorStats; pendingCallbacks: number; resultsCount: number } {
    return {
      stats: this.getStats(),
      pendingCallbacks: this.pendingCallbacks.size,
      resultsCount: this.executionResults.length,
    };
  }

  reset(): void {
    this.executionCount = 0;
    this.successCount = 0;
    this.totalDuration = 0;
    this.pendingCallbacks.clear();
    this.executionResults = [];
  }

  getReport(): string {
    const stats = this.getStats();
    return `SerializerExecutor Report:
  Total Executions: ${stats.totalExecutions}
  Successful: ${stats.successfulExecutions}
  Failed: ${stats.failedExecutions}
  Avg Duration: ${stats.averageDuration.toFixed(2)}ms
  Config: maxConcurrent=${this.config.maxConcurrent}, timeout=${this.config.timeout}`;
  }

  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: 'V119',
      stats: this.getStats(),
      config: this.config,
    };
  }
}