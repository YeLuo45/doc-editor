import { describe, it, expect } from 'vitest';
import {
  createConflictDetectorState, detectConflict, getConflictsByPath, getConflictsBySeverity,
  resolveConflictAt, clearConflicts, getConflictDetectorReport,
  type Op,
} from '../../federation/V218-ConflictDetector';

describe('V218 ConflictDetector', () => {
  const op = (overrides: Partial<Op>): Op => ({ id: 'op1', type: 'update', path: '/doc/section1', value: 'x', timestamp: Date.now(), deviceId: 'dev1', ...overrides });

  it('should create empty state', () => {
    const s = createConflictDetectorState();
    expect(s.conflicts).toHaveLength(0);
  });

  it('should not conflict on different paths', () => {
    const s = createConflictDetectorState();
    const r = detectConflict(s, op({ path: '/a' }), op({ path: '/b' }));
    expect(r.conflict).toBeUndefined();
  });

  it('should detect delete-edit conflict', () => {
    const s = createConflictDetectorState();
    const r = detectConflict(s, op({ type: 'delete' }), op({ type: 'update' }));
    expect(r.conflict!.type).toBe('delete_edit');
    expect(r.conflict!.severity).toBe('high');
  });

  it('should detect concurrent edit conflict', () => {
    const s = createConflictDetectorState();
    const r = detectConflict(s, op({ timestamp: 1000 }), op({ timestamp: 1100 }));
    expect(r.conflict!.type).toBe('concurrent_edit');
  });

  it('should not conflict on sequential updates', () => {
    const s = createConflictDetectorState();
    const r = detectConflict(s, op({ timestamp: 1000 }), op({ timestamp: 5000 }));
    expect(r.conflict).toBeUndefined();
  });

  it('should detect type mismatch', () => {
    const s = createConflictDetectorState();
    const r = detectConflict(s, op({ type: 'insert', timestamp: 1000 }), op({ type: 'delete', timestamp: 1100 }));
    expect(r.conflict!.type).toBe('type_mismatch');
  });

  it('should get conflicts by path', () => {
    let s = createConflictDetectorState();
    s = detectConflict(s, op({ path: '/a' }), op({ path: '/a' })).state;
    s = detectConflict(s, op({ path: '/b', timestamp: 1000 }), op({ path: '/b', timestamp: 1100 })).state;
    expect(getConflictsByPath(s, '/a')).toHaveLength(1);
  });

  it('should get conflicts by severity', () => {
    let s = createConflictDetectorState();
    s = detectConflict(s, op({ type: 'delete' }), op({ type: 'update' })).state;
    expect(getConflictsBySeverity(s, 'high')).toHaveLength(1);
  });

  it('should resolve conflict at index', () => {
    let s = createConflictDetectorState();
    s = detectConflict(s, op({ type: 'delete' }), op({ type: 'update' })).state;
    s = detectConflict(s, op({ timestamp: 1000 }), op({ timestamp: 1100 })).state;
    s = resolveConflictAt(s, 0);
    expect(s.conflicts).toHaveLength(1);
  });

  it('should clear conflicts', () => {
    let s = createConflictDetectorState();
    s = detectConflict(s, op({ type: 'delete' }), op({ type: 'update' })).state;
    s = clearConflicts(s);
    expect(s.conflicts).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createConflictDetectorState();
    s = detectConflict(s, op({ type: 'delete' }), op({ type: 'update' })).state;
    const r = getConflictDetectorReport(s);
    expect(r.total).toBe(1);
    expect(r.bySeverity.high).toBe(1);
  });
});
