/**
 * V58 Versioning System - DiffEngine
 * Text diff with compute/apply/getChanges
 */

export interface DiffConfig {
  contextLines: number;
  ignoreWhitespace: boolean;
  caseSensitive: boolean;
  wordGranularity: boolean;
}

export interface DiffChange {
  type: 'add' | 'remove' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffResult {
  changes: DiffChange[];
  additions: number;
  deletions: number;
  unchanged: number;
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffChange[];
}

export class DiffEngine {
  private _config: DiffConfig;
  private _lastDiff: DiffResult | null = null;
  private _diffHistory: DiffResult[] = [];

  constructor(config: Partial<DiffConfig> = {}) {
    this._config = {
      contextLines: config.contextLines ?? 3,
      ignoreWhitespace: config.ignoreWhitespace ?? false,
      caseSensitive: config.caseSensitive ?? true,
      wordGranularity: config.wordGranularity ?? false,
    };
  }

  get config(): DiffConfig {
    return { ...this._config };
  }

  compute(oldText: string, newText: string): DiffResult {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const changes: DiffChange[] = [];
    
    let oldIdx = 0;
    let newIdx = 0;
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      const oldLine = oldLines[oldIdx];
      const newLine = newLines[newIdx];
      
      if (this.linesMatch(oldLine, newLine)) {
        changes.push({
          type: 'unchanged',
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
          content: oldLine ?? '',
        });
        unchanged++;
        oldIdx++;
        newIdx++;
      } else if (oldIdx < oldLines.length && (newIdx >= newLines.length || this.shouldDelete(oldLine, newLines.slice(newIdx)))) {
        changes.push({
          type: 'remove',
          oldLineNumber: oldIdx + 1,
          content: oldLine ?? '',
        });
        deletions++;
        oldIdx++;
      } else if (newIdx < newLines.length) {
        changes.push({
          type: 'add',
          newLineNumber: newIdx + 1,
          content: newLine ?? '',
        });
        additions++;
        newIdx++;
      }
    }

    this._lastDiff = { changes, additions, deletions, unchanged };
    this._diffHistory.push(this._lastDiff);
    if (this._diffHistory.length > 100) {
      this._diffHistory.shift();
    }
    return this._lastDiff;
  }

  private linesMatch(oldLine: string | undefined, newLine: string | undefined): boolean {
    const o = oldLine ?? '';
    const n = newLine ?? '';
    
    let oProcessed = this._config.ignoreWhitespace ? o.trim() : o;
    let nProcessed = this._config.ignoreWhitespace ? n.trim() : n;
    
    if (!this._config.caseSensitive) {
      oProcessed = oProcessed.toLowerCase();
      nProcessed = nProcessed.toLowerCase();
    }
    
    return oProcessed === nProcessed;
  }

  private shouldDelete(oldLine: string, remainingNew: string[]): boolean {
    for (let i = 0; i < Math.min(remainingNew.length, 3); i++) {
      if (this.linesMatch(oldLine, remainingNew[i])) {
        return false;
      }
    }
    return true;
  }

  apply(original: string, diff: DiffResult): string {
    const result: string[] = [];
    const originalLines = original.split('\n');
    let oldIdx = 0;

    for (const change of diff.changes) {
      if (change.type === 'unchanged') {
        while (oldIdx < (change.oldLineNumber ?? 1) - 1) {
          oldIdx++;
        }
        result.push(originalLines[oldIdx] ?? '');
        oldIdx++;
      } else if (change.type === 'add') {
        result.push(change.content);
      } else if (change.type === 'remove') {
        oldIdx++;
      }
    }

    return result.join('\n');
  }

  getChanges(diff?: DiffResult): DiffChange[] {
    return (diff ?? this._lastDiff)?.changes ?? [];
  }

  getLastDiff(): DiffResult | null {
    return this._lastDiff;
  }

  getUnifiedDiff(oldText: string, newText: string, oldName = 'old', newName = 'new'): string {
    const diff = this.compute(oldText, newText);
    const lines: string[] = [
      `--- ${oldName}`,
      `+++ ${newName}`,
    ];

    let oldStart = 0;
    let newStart = 0;
    let inHunk = false;
    let hunkStart = 0;

    for (let i = 0; i < diff.changes.length; i++) {
      const change = diff.changes[i];
      const context = diff.changes.slice(Math.max(0, i - this._config.contextLines), i + this._config.contextLines);
      
      if (change.type !== 'unchanged') {
        if (!inHunk) {
          inHunk = true;
          hunkStart = i;
        }
      } else if (inHunk && context.every(c => c.type === 'unchanged')) {
        const hunk = diff.changes.slice(hunkStart, i + this._config.contextLines);
        const hunkLines = this.formatHunk(hunk, oldStart, newStart);
        lines.push(...hunkLines);
        inHunk = false;
      }

      if (change.type === 'remove') oldStart++;
      if (change.type === 'add') newStart++;
    }

    return lines.join('\n');
  }

  private formatHunk(hunk: DiffChange[], oldStart: number, newStart: number): string[] {
    const lines: string[] = [];
    lines.push(`@@ -${oldStart},${hunk.filter(c => c.type !== 'add').length} +${newStart},${hunk.filter(c => c.type !== 'remove').length} @@`);
    
    for (const change of hunk) {
      if (change.type === 'add') {
        lines.push(`+${change.content}`);
      } else if (change.type === 'remove') {
        lines.push(`-${change.content}`);
      } else {
        lines.push(` ${change.content}`);
      }
    }
    
    return lines;
  }

  getSnapshot(): { lastDiff: DiffResult | null; historySize: number } {
    return {
      lastDiff: this._lastDiff,
      historySize: this._diffHistory.length,
    };
  }

  reset(): void {
    this._lastDiff = null;
    this._diffHistory = [];
  }

  getReport(): string {
    return [
      '=== DiffEngine Report ===',
      `Last diff - Add: ${this._lastDiff?.additions ?? 0}, Del: ${this._lastDiff?.deletions ?? 0}, Unchanged: ${this._lastDiff?.unchanged ?? 0}`,
      `Diff history size: ${this._diffHistory.length}`,
      `Context lines: ${this._config.contextLines}`,
      `Ignore whitespace: ${this._config.ignoreWhitespace}`,
      `Case sensitive: ${this._config.caseSensitive}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: Record<string, number> } {
    return {
      version: 'V58-DiffEngine',
      metrics: {
        additions: this._lastDiff?.additions ?? 0,
        deletions: this._lastDiff?.deletions ?? 0,
        unchanged: this._lastDiff?.unchanged ?? 0,
        historySize: this._diffHistory.length,
      },
    };
  }
}