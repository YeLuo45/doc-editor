/**
 * V25 Offline-first Sync Engine - Conflict Resolution Module
 * Handles conflict detection and merging strategies
 */

export interface ConflictStrategy {
  type: 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
  priority?: 'local' | 'remote';
}

export interface ConflictRecord {
  id: string;
  entityType: string;
  entityId: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  strategy: ConflictStrategy;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merged';
  mergedValue?: unknown;
}

export interface MergeResult {
  success: boolean;
  value: unknown;
  hasConflicts: boolean;
  conflictCount: number;
}

export class ConflictResolver {
  private conflicts: Map<string, ConflictRecord> = new Map();
  private defaultStrategy: ConflictStrategy = { type: 'last-write-wins' };
  private metrics: ConflictMetrics;

  constructor(defaultStrategy?: ConflictStrategy) {
    if (defaultStrategy) {
      this.defaultStrategy = defaultStrategy;
    }
    this.metrics = {
      totalDetected: 0,
      totalResolved: 0,
      autoResolved: 0,
      manualResolved: 0,
      mergeAttempts: 0,
      mergeSuccesses: 0,
    };
  }

  /**
   * Detect if there's a conflict between local and remote versions
   */
  detectConflict(
    entityType: string,
    entityId: string,
    localValue: unknown,
    remoteValue: unknown,
    localTimestamp: number,
    remoteTimestamp: number
  ): boolean {
    // Conflict exists if values differ and timestamps are close
    const timeDiff = Math.abs(localTimestamp - remoteTimestamp);
    const valuesDiffer = JSON.stringify(localValue) !== JSON.stringify(remoteValue);
    
    // Consider it a conflict if values differ and within 5 second window
    const isConflict = valuesDiffer && timeDiff < 5000;
    
    if (isConflict) {
      const conflictId = this.generateConflictId(entityType, entityId);
      const record: ConflictRecord = {
        id: conflictId,
        entityType,
        entityId,
        localValue,
        remoteValue,
        localTimestamp,
        remoteTimestamp,
        strategy: this.defaultStrategy,
        resolved: false,
      };
      this.conflicts.set(conflictId, record);
      this.metrics.totalDetected++;
    }
    
    return isConflict;
  }

  /**
   * Check if a conflict exists for a given entity
   */
  hasConflict(entityType: string, entityId: string): boolean {
    const conflictId = this.generateConflictId(entityType, entityId);
    const record = this.conflicts.get(conflictId);
    return record ? !record.resolved : false;
  }

  /**
   * Get conflict record by ID
   */
  getConflict(conflictId: string): ConflictRecord | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get all active (unresolved) conflicts
   */
  getActiveConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved);
  }

  /**
   * Resolve a conflict using specified strategy
   */
  resolve(conflictId: string, strategy: ConflictStrategy, mergedValue?: unknown): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict || conflict.resolved) return false;

    let resolution: 'local' | 'remote' | 'merged';
    let finalValue: unknown;

    switch (strategy.type) {
      case 'last-write-wins':
        resolution = conflict.localTimestamp > conflict.remoteTimestamp ? 'local' : 'remote';
        finalValue = resolution === 'local' ? conflict.localValue : conflict.remoteValue;
        break;
      case 'first-write-wins':
        resolution = conflict.localTimestamp < conflict.remoteTimestamp ? 'local' : 'remote';
        finalValue = resolution === 'local' ? conflict.localValue : conflict.remoteValue;
        break;
      case 'merge':
        resolution = 'merged';
        finalValue = mergedValue;
        this.metrics.mergeSuccesses++;
        break;
      case 'manual':
        resolution = 'local'; // Default fallback
        finalValue = conflict.localValue;
        break;
      default:
        return false;
    }

    conflict.resolution = resolution;
    conflict.resolved = true;
    if (resolution === 'merged' && finalValue !== undefined) {
      conflict.mergedValue = finalValue;
    }

    this.metrics.totalResolved++;
    if (strategy.type === 'manual') {
      this.metrics.manualResolved++;
    } else {
      this.metrics.autoResolved++;
    }

    return true;
  }

  /**
   * Merge changes from multiple sources
   */
  mergeChanges(changes: Array<{ value: unknown; timestamp: number }>): MergeResult {
    this.metrics.mergeAttempts++;

    if (changes.length === 0) {
      return { success: true, value: null, hasConflicts: false, conflictCount: 0 };
    }

    if (changes.length === 1) {
      return { success: true, value: changes[0].value, hasConflicts: false, conflictCount: 0 };
    }

    // Check for conflicts
    const uniqueValues = new Set(changes.map(c => JSON.stringify(c.value)));
    const hasConflicts = uniqueValues.size > 1;

    // For simple merge, take the most recent value
    const sorted = [...changes].sort((a, b) => b.timestamp - a.timestamp);
    const mostRecent = sorted[0].value;

    return {
      success: true,
      value: mostRecent,
      hasConflicts,
      conflictCount: hasConflicts ? uniqueValues.size - 1 : 0,
    };
  }

  /**
   * Auto-resolve all conflicts using default strategy
   */
  autoResolveAll(): number {
    const activeConflicts = this.getActiveConflicts();
    let resolvedCount = 0;

    for (const conflict of activeConflicts) {
      if (this.resolve(conflict.id, this.defaultStrategy)) {
        resolvedCount++;
      }
    }

    return resolvedCount;
  }

  /**
   * Get current snapshot for debugging
   */
  getSnapshot(): object {
    return {
      activeConflictCount: this.getActiveConflicts().length,
      totalConflicts: this.conflicts.size,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset the resolver to initial state
   */
  reset(): void {
    this.conflicts.clear();
    this.metrics = {
      totalDetected: 0,
      totalResolved: 0,
      autoResolved: 0,
      manualResolved: 0,
      mergeAttempts: 0,
      mergeSuccesses: 0,
    };
  }

  /**
   * Get a report of conflict resolution state
   */
  getReport(): object {
    const activeConflicts = this.getActiveConflicts();
    return {
      totalConflicts: this.conflicts.size,
      activeConflicts: activeConflicts.length,
      resolvedConflicts: this.conflicts.size - activeConflicts.length,
      autoResolved: this.metrics.autoResolved,
      manualResolved: this.metrics.manualResolved,
      mergeSuccessRate: this.metrics.mergeAttempts > 0
        ? this.metrics.mergeSuccesses / this.metrics.mergeAttempts
        : 0,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): object {
    return {
      ...this.metrics,
      conflictRate: this.metrics.totalDetected > 0
        ? this.metrics.totalResolved / this.metrics.totalDetected
        : 0,
      resolutionRate: this.metrics.totalDetected > 0
        ? this.metrics.totalResolved / this.metrics.totalDetected
        : 1,
    };
  }

  private generateConflictId(entityType: string, entityId: string): string {
    return `conflict_${entityType}_${entityId}_${Date.now()}`;
  }
}

interface ConflictMetrics {
  totalDetected: number;
  totalResolved: number;
  autoResolved: number;
  manualResolved: number;
  mergeAttempts: number;
  mergeSuccesses: number;
}

export default ConflictResolver;