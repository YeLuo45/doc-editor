/**
 * OperationProfiler.ts - Operation-level profiling for CRDT/OT operations in doc-editor V22
 */

export type OperationType = 'insert' | 'delete' | 'retain' | 'ack' | 'sync' | 'transform';

export interface OperationRecord {
  id: string;
  type: OperationType;
  timestamp: number;
  duration: number;
  size: number;
  success: boolean;
  componentId?: string;
}

export interface OperationStats {
  operationType: OperationType;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successCount: number;
  failureCount: number;
  totalSize: number;
  throughput: number;
}

export interface OperationReport {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  overallAvgDuration: number;
  totalSize: number;
  statsByType: OperationStats[];
}

export class OperationProfiler {
  private operations: OperationRecord[] = [];
  private operationCounts: Map<OperationType, number> = new Map();
  private startTime: number = Date.now();

  profileOperation(
    type: OperationType,
    duration: number,
    size: number,
    success: boolean,
    componentId?: string
  ): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const record: OperationRecord = {
      id,
      type,
      timestamp: Date.now(),
      duration,
      size,
      success,
      componentId,
    };

    this.operations.push(record);

    const count = this.operationCounts.get(type) || 0;
    this.operationCounts.set(type, count + 1);

    return id;
  }

  getOperationStats(type?: OperationType): OperationStats | OperationStats[] {
    if (type) {
      return this.calculateStatsForType(type);
    }
    return this.getAllStats();
  }

  getReport(): OperationReport {
    const allStats = this.getAllStats();
    const totalOps = this.operations.length;
    const successfulOps = this.operations.filter(o => o.success).length;
    const failedOps = totalOps - successfulOps;
    const totalSize = this.operations.reduce((sum, o) => sum + o.size, 0);

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      overallAvgDuration: totalOps > 0
        ? this.operations.reduce((sum, o) => sum + o.duration, 0) / totalOps
        : 0,
      totalSize,
      statsByType: allStats,
    };
  }

  getSnapshot(): {
    totalOperations: number;
    operationTypes: OperationType[];
    activeTime: number;
  } {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      totalOperations: this.operations.length,
      operationTypes: Array.from(this.operationCounts.keys()),
      activeTime: elapsed,
    };
  }

  reset(): void {
    this.operations = [];
    this.operationCounts.clear();
    this.startTime = Date.now();
  }

  exportMetrics(): Record<string, unknown> {
    const report = this.getReport();
    const recentOps = this.operations.slice(-50).map(op => ({
      id: op.id,
      type: op.type,
      duration: op.duration,
      size: op.size,
      success: op.success,
      timestamp: op.timestamp,
    }));

    return {
      timestamp: Date.now(),
      startTime: this.startTime,
      summary: {
        totalOperations: report.totalOperations,
        successfulOperations: report.successfulOperations,
        failedOperations: report.failedOperations,
        overallAvgDuration: report.overallAvgDuration,
        totalSize: report.totalSize,
      },
      byType: report.statsByType,
      recentOperations: recentOps,
    };
  }

  getOperationsByType(type: OperationType): OperationRecord[] {
    return this.operations.filter(op => op.type === type);
  }

  getRecentOperations(count: number = 10): OperationRecord[] {
    return this.operations.slice(-count);
  }

  getSlowOperations(limit: number = 10): OperationRecord[] {
    return [...this.operations]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  private calculateStatsForType(type: OperationType): OperationStats {
    const ops = this.operations.filter(o => o.type === type);

    if (ops.length === 0) {
      return this.createEmptyStats(type);
    }

    const durations = ops.map(o => o.duration);
    const successCount = ops.filter(o => o.success).length;
    const totalSize = ops.reduce((sum, o) => sum + o.size, 0);
    const elapsed = (Date.now() - this.startTime) / 1000;

    return {
      operationType: type,
      count: ops.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      avgDuration: durations.reduce((a, b) => a + b, 0) / ops.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successCount,
      failureCount: ops.length - successCount,
      totalSize,
      throughput: elapsed > 0 ? ops.length / elapsed : 0,
    };
  }

  private getAllStats(): OperationStats[] {
    const types: OperationType[] = ['insert', 'delete', 'retain', 'ack', 'sync', 'transform'];
    return types.map(type => this.calculateStatsForType(type)).filter(s => s.count > 0);
  }

  private createEmptyStats(type: OperationType): OperationStats {
    return {
      operationType: type,
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      successCount: 0,
      failureCount: 0,
      totalSize: 0,
      throughput: 0,
    };
  }
}

export const defaultOperationProfiler = new OperationProfiler();