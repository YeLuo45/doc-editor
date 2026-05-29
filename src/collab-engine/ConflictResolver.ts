/**
 * V57 ConflictResolver - Operational Transform for conflict resolution
 * Implements resolve/compose/transform operations for OT
 */

export interface TransformConfig {
  operationTimeout?: number;
  maxHistorySize?: number;
  conflictThreshold?: number;
}

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  version: number;
  timestamp: number;
}

export interface TransformResult {
  operation: Operation;
  transformed: boolean;
  conflictsResolved: number;
}

export interface ConflictMetrics {
  totalTransforms: number;
  totalComposes: number;
  totalResolves: number;
  activeConflicts: number;
  timestamp: number;
}

export class ConflictResolver {
  config: TransformConfig;
  private history: Operation[] = [];
  private transformCount: number = 0;
  private composeCount: number = 0;
  private resolveCount: number = 0;
  private activeConflicts: number = 0;

  constructor(config: TransformConfig = {}) {
    this.config = {
      operationTimeout: config.operationTimeout ?? 5000,
      maxHistorySize: config.maxHistorySize ?? 1000,
      conflictThreshold: config.conflictThreshold ?? 3,
    };
  }

  transform(op1: Operation, op2: Operation): Operation {
    this.transformCount++;
    const transformed: Operation = { ...op1 };

    if (op1.position >= op2.position) {
      if (op1.type === 'insert' && op2.type === 'insert') {
        transformed.position += op2.content?.length ?? 0;
      } else if (op1.type === 'delete' && op2.type === 'insert') {
        transformed.position += op2.content?.length ?? 0;
      } else if (op1.type === 'delete' && op2.type === 'delete') {
        if (op1.length && op2.length) {
          if (op2.position + op2.length <= op1.position) {
            transformed.position -= op2.length;
          } else if (op2.position >= op1.position + op1.length) {
            // no change
          } else {
            transformed.length = Math.max(0, op1.length - op2.length);
          }
        }
      }
    }
    return transformed;
  }

  compose(op1: Operation, op2: Operation): Operation | null {
    this.composeCount++;
    if (op1.userId !== op2.userId) {
      return null;
    }
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position + (op1.content?.length ?? 0) === op2.position) {
        return {
          id: `composed-${Date.now()}`,
          type: 'insert',
          position: op1.position,
          content: (op1.content ?? '') + (op2.content ?? ''),
          userId: op1.userId,
          version: Math.max(op1.version, op2.version) + 1,
          timestamp: Date.now(),
        };
      }
    }
    return null;
  }

  resolve(incoming: Operation, base: Operation): TransformResult {
    this.resolveCount++;
    this.activeConflicts++;
    const transformed = this.transform(incoming, base);
    this.activeConflicts = Math.max(0, this.activeConflicts - 1);
    return {
      operation: transformed,
      transformed: transformed.position !== incoming.position,
      conflictsResolved: 1,
    };
  }

  addToHistory(operation: Operation): void {
    this.history.push(operation);
    if (this.history.length > (this.config.maxHistorySize ?? 1000)) {
      this.history.shift();
    }
  }

  getHistory(): Operation[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  getSnapshot(): { metrics: ConflictMetrics } {
    return {
      metrics: {
        totalTransforms: this.transformCount,
        totalComposes: this.composeCount,
        totalResolves: this.resolveCount,
        activeConflicts: this.activeConflicts,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this.history = [];
    this.transformCount = 0;
    this.composeCount = 0;
    this.resolveCount = 0;
    this.activeConflicts = 0;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== ConflictResolver Report ===',
      `Total Transforms: ${snap.metrics.totalTransforms}`,
      `Total Composes: ${snap.metrics.totalComposes}`,
      `Total Resolves: ${snap.metrics.totalResolves}`,
      `Active Conflicts: ${snap.metrics.activeConflicts}`,
      `History Size: ${this.history.length}`,
      `Timestamp: ${new Date(snap.metrics.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'V57-ConflictResolver-1.0.0' };
  }
}