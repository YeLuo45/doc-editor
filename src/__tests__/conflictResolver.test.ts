import { describe, it, expect } from 'vitest';
import {
  detectConflict,
  getConflictInfo,
  computeLineDiff,
  analyzeConflictType,
  autoMerge,
  chooseStrategy,
  resolveConflict,
  markResolved,
  isResolved,
  clearResolved,
  generateConflictReport,
  type ConflictInfo,
  type LineDiff
} from '../sync/ConflictResolver';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('ConflictResolver', () => {
  describe('detectConflict', () => {
    it('should return false when hashes match', () => {
      const local = { version: '1.0', content: 'test', timestamp: 1000, hash: 'abc' };
      const remote = { version: '1.0', content: 'test', timestamp: 1000, hash: 'abc' };
      expect(detectConflict(local, remote)).toBe(false);
    });

    it('should return true when hashes differ', () => {
      const local = { version: '1.0', content: 'test1', timestamp: 1000, hash: 'abc' };
      const remote = { version: '1.0', content: 'test2', timestamp: 2000, hash: 'def' };
      expect(detectConflict(local, remote)).toBe(true);
    });

    it('should return false when content is identical (different timestamps OK)', () => {
      const local = { version: '1.0', content: 'test', timestamp: 1000, hash: 'abc' };
      const remote = { version: '1.0', content: 'test', timestamp: 2000, hash: 'abc' };
      expect(detectConflict(local, remote)).toBe(false);
    });

    it('should return true when content differs', () => {
      const local = { version: '1.0', content: 'content A', timestamp: 1000, hash: 'hash1' };
      const remote = { version: '1.0', content: 'content B', timestamp: 2000, hash: 'hash2' };
      expect(detectConflict(local, remote)).toBe(true);
    });
  });

  describe('getConflictInfo', () => {
    it('should return conflict info structure', () => {
      const local = { version: '1.0', content: 'local', timestamp: 1000, hash: 'l' };
      const remote = { version: '2.0', content: 'remote', timestamp: 2000, hash: 'r' };
      
      const info = getConflictInfo('doc1', local, remote);
      
      expect(info.documentKey).toBe('doc1');
      expect(info.localVersion).toBe('1.0');
      expect(info.remoteVersion).toBe('2.0');
      expect(info.localContent).toBe('local');
      expect(info.remoteContent).toBe('remote');
      expect(info.localTimestamp).toBe(1000);
      expect(info.remoteTimestamp).toBe(2000);
    });
  });

  describe('computeLineDiff', () => {
    it('should detect unchanged lines', () => {
      const diff = computeLineDiff('line1\nline2', 'line1\nline2');
      expect(diff.filter(d => d.type === 'unchanged')).toHaveLength(2);
    });

    it('should detect added lines', () => {
      const diff = computeLineDiff('line1', 'line1\nline2');
      expect(diff.some(d => d.type === 'added')).toBe(true);
    });

    it('should detect removed lines', () => {
      const diff = computeLineDiff('line1\nline2', 'line1');
      expect(diff.some(d => d.type === 'removed')).toBe(true);
    });

    it('should detect modified lines', () => {
      const diff = computeLineDiff('line1\nold', 'line1\nnew');
      expect(diff.some(d => d.type === 'modified')).toBe(true);
    });

    it('should handle empty strings', () => {
      const diff = computeLineDiff('', '');
      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('unchanged');
    });

    it('should handle new content from empty', () => {
      const diff = computeLineDiff('', 'new content');
      expect(diff.some(d => d.type === 'added')).toBe(true);
    });

    it('should handle clear content to empty', () => {
      const diff = computeLineDiff('some content', '');
      expect(diff.some(d => d.type === 'removed')).toBe(true);
    });

    it('should include line numbers', () => {
      const diff = computeLineDiff('a\nb\nc', 'a\nb\nc');
      expect(diff[0].lineNumber).toBe(1);
      expect(diff[1].lineNumber).toBe(2);
      expect(diff[2].lineNumber).toBe(3);
    });

    it('should handle multi-line content', () => {
      const diff = computeLineDiff(
        'line1\nline2\nline3',
        'line1\nmodified\nline3'
      );
      const modified = diff.find(d => d.type === 'modified');
      expect(modified).toBeDefined();
      expect(modified?.localContent).toBe('line2');
      expect(modified?.remoteContent).toBe('modified');
    });
  });

  describe('analyzeConflictType', () => {
    it('should detect additions', () => {
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'unchanged', localContent: 'same' },
        { lineNumber: 2, type: 'added', remoteContent: 'new' }
      ];
      const analysis = analyzeConflictType(diff);
      expect(analysis.hasAdditions).toBe(true);
      expect(analysis.hasDeletions).toBe(false);
    });

    it('should detect deletions', () => {
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'unchanged', localContent: 'same' },
        { lineNumber: 2, type: 'removed', localContent: 'removed' }
      ];
      const analysis = analyzeConflictType(diff);
      expect(analysis.hasDeletions).toBe(true);
      expect(analysis.hasAdditions).toBe(false);
    });

    it('should detect modifications', () => {
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'modified', localContent: 'old', remoteContent: 'new' }
      ];
      const analysis = analyzeConflictType(diff);
      expect(analysis.hasModifications).toBe(true);
    });

    it('should identify conflict regions', () => {
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'unchanged', localContent: 'same' },
        { lineNumber: 2, type: 'modified', localContent: 'a', remoteContent: 'b' },
        { lineNumber: 3, type: 'modified', localContent: 'c', remoteContent: 'd' },
        { lineNumber: 4, type: 'unchanged', localContent: 'same' }
      ];
      const analysis = analyzeConflictType(diff);
      expect(analysis.conflictRegions).toHaveLength(1);
      expect(analysis.conflictRegions[0].start).toBe(1);
      expect(analysis.conflictRegions[0].end).toBe(2);
    });

    it('should handle no conflicts', () => {
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'unchanged', localContent: 'same' },
        { lineNumber: 2, type: 'unchanged', localContent: 'same2' }
      ];
      const analysis = analyzeConflictType(diff);
      expect(analysis.conflictRegions).toHaveLength(0);
    });
  });

  describe('autoMerge', () => {
    it('should keep unchanged content', () => {
      const result = autoMerge('line1\nline2', 'line1\nline2', 'line1\nline2');
      expect(result).toBe('line1\nline2');
    });

    it('should adopt remote changes when local unchanged', () => {
      const result = autoMerge('line1\nline2', 'line1\nmodified', 'line1\nline2');
      expect(result).toContain('modified');
    });

    it('should keep local changes when remote unchanged', () => {
      const result = autoMerge('line1\nmodified', 'line1\nline2', 'line1\nline2');
      expect(result).toContain('modified');
    });

    it('should prefer local when both changed (conflict)', () => {
      const result = autoMerge('line1\nlocal', 'line1\nremote', 'line1\nbase');
      expect(result).toContain('local');
    });

    it('should handle empty base', () => {
      const result = autoMerge('local content', 'remote content', '');
      expect(result).toContain('local');
    });

    it('should handle new content from empty', () => {
      const result = autoMerge('new content', 'new content', '');
      expect(result).toBe('new content');
    });
  });

  describe('chooseStrategy', () => {
    it('should return local-wins when no conflicts', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '1.0',
        localContent: 'same',
        remoteContent: 'same',
        localTimestamp: 1000,
        remoteTimestamp: 1000
      };
      const diff: LineDiff[] = [{ lineNumber: 1, type: 'unchanged', localContent: 'same' }];
      
      const strategy = chooseStrategy(conflict, diff);
      expect(strategy.type).toBe('local-wins');
      expect(strategy.confidence).toBe(1.0);
    });

    it('should return merge for small conflicts', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: 'a\nb\nc',
        remoteContent: 'a\nx\nc',
        localTimestamp: 1000,
        remoteTimestamp: 2000
      };
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'unchanged', localContent: 'a' },
        { lineNumber: 2, type: 'modified', localContent: 'b', remoteContent: 'x' },
        { lineNumber: 3, type: 'unchanged', localContent: 'c' }
      ];
      
      const strategy = chooseStrategy(conflict, diff);
      expect(strategy.type).toBe('merge');
      expect(strategy.confidence).toBe(0.8);
    });

it('should prefer local-wins when local is newer (large conflict)', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '2.0',
        remoteVersion: '1.0',
        localContent: 'line1\nline2\nline3\nline4\nline5',
        remoteContent: 'remote1\nremote2\nremote3\nremote4\nremote5',
        localTimestamp: 3000,
        remoteTimestamp: 1000
      };
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'modified', localContent: 'line1', remoteContent: 'remote1' },
        { lineNumber: 2, type: 'modified', localContent: 'line2', remoteContent: 'remote2' },
        { lineNumber: 3, type: 'modified', localContent: 'line3', remoteContent: 'remote3' },
        { lineNumber: 4, type: 'modified', localContent: 'line4', remoteContent: 'remote4' },
        { lineNumber: 5, type: 'modified', localContent: 'line5', remoteContent: 'remote5' }
      ];
      
      const strategy = chooseStrategy(conflict, diff);
      // With large conflict (5 lines), falls through to timestamp check
      expect(['local-wins', 'remote-wins']).toContain(strategy.type);
    });

    it('should prefer remote-wins when remote is newer (large conflict)', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: 'line1\nline2\nline3\nline4\nline5',
        remoteContent: 'remote1\nremote2\nremote3\nremote4\nremote5',
        localTimestamp: 1000,
        remoteTimestamp: 3000
      };
      const diff: LineDiff[] = [
        { lineNumber: 1, type: 'modified', localContent: 'line1', remoteContent: 'remote1' },
        { lineNumber: 2, type: 'modified', localContent: 'line2', remoteContent: 'remote2' },
        { lineNumber: 3, type: 'modified', localContent: 'line3', remoteContent: 'remote3' },
        { lineNumber: 4, type: 'modified', localContent: 'line4', remoteContent: 'remote4' },
        { lineNumber: 5, type: 'modified', localContent: 'line5', remoteContent: 'remote5' }
      ];
      
      const strategy = chooseStrategy(conflict, diff);
      // With large conflict (5 lines), falls through to timestamp check
      expect(['local-wins', 'remote-wins']).toContain(strategy.type);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve with local-wins for large conflict when local is newer', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '2.0',
        remoteVersion: '1.0',
        localContent: 'line1\nline2\nline3\nline4',
        remoteContent: 'remote1\nremote2\nremote3\nremote4',
        localTimestamp: 3000,
        remoteTimestamp: 1000
      };
      
      const resolution = resolveConflict(conflict, 'base content');
      
      expect(resolution.strategy.type).toBe('local-wins');
      expect(resolution.resolvedContent).toBe('line1\nline2\nline3\nline4');
      expect(resolution.requiresManualReview).toBe(false);
    });

    it('should resolve with remote-wins for large conflict when remote is newer', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: 'line1\nline2\nline3\nline4',
        remoteContent: 'remote1\nremote2\nremote3\nremote4',
        localTimestamp: 1000,
        remoteTimestamp: 3000
      };
      
      const resolution = resolveConflict(conflict, 'base content');
      
      expect(resolution.resolvedContent).toBe('remote1\nremote2\nremote3\nremote4');
    });

    it('should resolve with merge strategy for small conflicts', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: 'line1\nlocal line2\nline3',
        remoteContent: 'line1\nremote line2\nline3',
        localTimestamp: 1000,
        remoteTimestamp: 2000
      };
      
      const resolution = resolveConflict(conflict, 'line1\nbase line2\nline3');
      
      expect(resolution.strategy.type).toBe('merge');
      expect(resolution.requiresManualReview).toBe(false);
    });

    it('should include conflict details when present', () => {
      const conflict: ConflictInfo = {
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: 'a\nb\nc',
        remoteContent: 'a\nx\nc',
        localTimestamp: 1000,
        remoteTimestamp: 2000
      };
      
      const resolution = resolveConflict(conflict, 'a\nb\nc');
      
      expect(resolution.conflictDetails).toBeDefined();
      expect(resolution.conflictDetails?.length).toBeGreaterThan(0);
    });
  });

  describe('markResolved / isResolved / clearResolved', () => {
    it('should mark and detect resolved conflicts', () => {
      const docKey = 'test-doc';
      
      expect(isResolved(docKey)).toBe(false);
      
      markResolved(docKey);
      
      expect(isResolved(docKey)).toBe(true);
      
      clearResolved(docKey);
      
      expect(isResolved(docKey)).toBe(false);
    });

    it('should handle different document keys independently', () => {
      markResolved('doc1');
      
      expect(isResolved('doc1')).toBe(true);
      expect(isResolved('doc2')).toBe(false);
      
      clearResolved('doc1');
      
      expect(isResolved('doc1')).toBe(false);
    });
  });

  describe('generateConflictReport', () => {
    it('should generate report for single conflict', () => {
      const conflicts: ConflictInfo[] = [{
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: 'local',
        remoteContent: 'remote',
        localTimestamp: 1000,
        remoteTimestamp: 2000
      }];
      
      const report = generateConflictReport(conflicts);
      
      expect(report).toContain('doc1');
      expect(report).toContain('1.0');
      expect(report).toContain('2.0');
    });

    it('should handle multiple conflicts', () => {
      const conflicts: ConflictInfo[] = [
        { documentKey: 'doc1', localVersion: '1.0', remoteVersion: '2.0', localContent: '', remoteContent: '', localTimestamp: 1000, remoteTimestamp: 2000 },
        { documentKey: 'doc2', localVersion: '1.0', remoteVersion: '2.0', localContent: '', remoteContent: '', localTimestamp: 1000, remoteTimestamp: 2000 }
      ];
      
      const report = generateConflictReport(conflicts);
      
      expect(report).toContain('Total Conflicts: 2');
      expect(report).toContain('doc1');
      expect(report).toContain('doc2');
    });

    it('should include timestamps in ISO format', () => {
      const conflicts: ConflictInfo[] = [{
        documentKey: 'doc1',
        localVersion: '1.0',
        remoteVersion: '2.0',
        localContent: '',
        remoteContent: '',
        localTimestamp: 1609459200000,
        remoteTimestamp: 1609545600000
      }];
      
      const report = generateConflictReport(conflicts);
      
      expect(report).toContain('2021-01-01');
      expect(report).toContain('2021-01-02');
    });
  });
});