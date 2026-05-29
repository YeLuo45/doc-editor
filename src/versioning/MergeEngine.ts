/**
 * V58 Versioning System - MergeEngine
 * Merge logic with merge/resolve/conflicts
 */

export interface MergeConfig {
  allowFastForward: boolean;
  conflictStrategy: 'manual' | 'ours' | 'theirs';
  autoResolve: boolean;
  requireCommitMessage: boolean;
}

export interface Conflict {
  file: string;
  oldContent: string;
  ourContent: string;
  theirContent: string;
  resolved: boolean;
  resolution?: string;
}

export interface MergeResult {
  success: boolean;
  conflicts: Conflict[];
  resolved: number;
  unresolved: number;
  mergedContent?: string;
}

export interface MergeCommit {
  id: string;
  parentIds: string[];
  message: string;
  timestamp: number;
  changes: number;
}

export class MergeEngine {
  private _config: MergeConfig;
  private _activeMerges: Map<string, MergeResult> = new Map();
  private _mergeHistory: MergeResult[] = [];
  private _conflicts: Conflict[] = [];

  constructor(config: Partial<MergeConfig> = {}) {
    this._config = {
      allowFastForward: config.allowFastForward ?? true,
      conflictStrategy: config.conflictStrategy ?? 'manual',
      autoResolve: config.autoResolve ?? false,
      requireCommitMessage: config.requireCommitMessage ?? false,
    };
  }

  get config(): MergeConfig {
    return { ...this._config };
  }

  merge(ours: string, theirs: string, base?: string): MergeResult {
    let result: MergeResult;

    if (base && base !== ours && base !== theirs) {
      result = this.threeWayMerge(base, ours, theirs);
    } else {
      result = this.simpleMerge(ours, theirs);
    }

    // Track conflicts in instance
    this._conflicts = result.conflicts;

    const mergeId = `merge_${Date.now()}`;
    this._activeMerges.set(mergeId, result);
    this._mergeHistory.push(result);
    
    if (this._mergeHistory.length > 100) {
      this._mergeHistory.shift();
    }

    return result;
  }

  private simpleMerge(ours: string, theirs: string): MergeResult {
    const ourLines = ours.split('\n');
    const theirLines = theirs.split('\n');
    const conflicts: Conflict[] = [];
    const result: string[] = [];
    
    const maxLen = Math.max(ourLines.length, theirLines.length);
    
    for (let i = 0; i < maxLen; i++) {
      const ourLine = ourLines[i];
      const theirLine = theirLines[i];
      
      if (ourLine === theirLine) {
        result.push(ourLine ?? '');
      } else if (ourLine === undefined) {
        result.push(theirLine ?? '');
      } else if (theirLine === undefined) {
        result.push(ourLine ?? '');
      } else {
        conflicts.push({
          file: 'document.txt',
          oldContent: '',
          ourContent: ourLine,
          theirContent: theirLine,
          resolved: false,
        });
        result.push(`<<<<<<< OURS\n${ourLine}\n=======\n${theirLine}\n>>>>>>> THEIRS`);
      }
    }

    const resolved = conflicts.filter(c => c.resolved).length;
    return {
      success: conflicts.length === 0,
      conflicts,
      resolved,
      unresolved: conflicts.length - resolved,
      mergedContent: result.join('\n'),
    };
  }

  private threeWayMerge(base: string, ours: string, theirs: string): MergeResult {
    const baseLines = base.split('\n');
    const ourLines = ours.split('\n');
    const theirLines = theirs.split('\n');
    const conflicts: Conflict[] = [];
    const result: string[] = [];

    const maxLen = Math.max(baseLines.length, ourLines.length, theirLines.length);

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i];
      const ourLine = ourLines[i];
      const theirLine = theirLines[i];

      const ourChanged = ourLine !== baseLine;
      const theirChanged = theirLine !== baseLine;

      if (!ourChanged && !theirChanged) {
        result.push(baseLine ?? '');
      } else if (ourChanged && !theirChanged) {
        result.push(ourLine ?? '');
      } else if (!ourChanged && theirChanged) {
        result.push(theirLine ?? '');
      } else if (ourLine === theirLine) {
        result.push(ourLine ?? '');
      } else {
        conflicts.push({
          file: 'document.txt',
          oldContent: baseLine ?? '',
          ourContent: ourLine ?? '',
          theirContent: theirLine ?? '',
          resolved: false,
        });
        if (this._config.autoResolve) {
          const conflict = conflicts[conflicts.length - 1];
          if (this._config.conflictStrategy === 'ours') {
            conflict.resolution = conflict.ourContent;
          } else if (this._config.conflictStrategy === 'theirs') {
            conflict.resolution = conflict.theirContent;
          }
        }
        result.push(`<<<<<<< OURS\n${ourLine}\n=======\n${theirLine}\n>>>>>>> THEIRS`);
      }
    }

    const resolved = conflicts.filter(c => c.resolved).length;
    return {
      success: conflicts.length === 0 || resolved === conflicts.length,
      conflicts,
      resolved,
      unresolved: conflicts.length - resolved,
      mergedContent: result.join('\n'),
    };
  }

  resolve(conflictIndex: number, resolution: string): boolean {
    if (conflictIndex < 0 || conflictIndex >= this._conflicts.length) {
      return false;
    }
    this._conflicts[conflictIndex].resolved = true;
    this._conflicts[conflictIndex].resolution = resolution;
    return true;
  }

  getConflicts(): Conflict[] {
    return [...this._conflicts];
  }

  hasConflicts(): boolean {
    return this._conflicts.some(c => !c.resolved);
  }

  getConflictCount(): number {
    return this._conflicts.filter(c => !c.resolved).length;
  }

  getActiveMerge(mergeId: string): MergeResult | undefined {
    return this._activeMerges.get(mergeId);
  }

  getMergeHistory(): MergeResult[] {
    return [...this._mergeHistory];
  }

  clearConflicts(): void {
    this._conflicts = [];
  }

  getSnapshot(): { activeMerges: number; totalConflicts: number; historySize: number } {
    return {
      activeMerges: this._activeMerges.size,
      totalConflicts: this._conflicts.length,
      historySize: this._mergeHistory.length,
    };
  }

  reset(): void {
    this._activeMerges.clear();
    this._mergeHistory = [];
    this._conflicts = [];
  }

  getReport(): string {
    return [
      '=== MergeEngine Report ===',
      `Active merges: ${this._activeMerges.size}`,
      `Total conflicts: ${this._conflicts.length}`,
      `Unresolved conflicts: ${this.getConflictCount()}`,
      `Merge history: ${this._mergeHistory.length}`,
      `Conflict strategy: ${this._config.conflictStrategy}`,
      `Auto resolve: ${this._config.autoResolve}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: Record<string, number | string> } {
    return {
      version: 'V58-MergeEngine',
      metrics: {
        activeMerges: this._activeMerges.size,
        totalConflicts: this._conflicts.length,
        unresolvedConflicts: this.getConflictCount(),
        historySize: this._mergeHistory.length,
        conflictStrategy: this._config.conflictStrategy,
      },
    };
  }
}