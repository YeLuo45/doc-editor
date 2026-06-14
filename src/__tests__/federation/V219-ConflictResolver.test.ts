import { describe, it, expect } from 'vitest';
import {
  createConflictResolverState, resolveLocalWins, resolveRemoteWins, resolveMerge, markManual,
  threeWayMerge, getResolutionForPath, getManualPending, clearResolutions, getResolverReport,
} from '../../federation/V219-ConflictResolver';

describe('V219 ConflictResolver', () => {
  it('should create empty state', () => {
    const s = createConflictResolverState();
    expect(s.resolutions).toHaveLength(0);
  });

  it('should resolve local wins', () => {
    let s = createConflictResolverState();
    s = resolveLocalWins(s, '/a', 'local', 'base', 'remote');
    expect(s.resolutions[0].finalValue).toBe('local');
  });

  it('should resolve remote wins', () => {
    let s = createConflictResolverState();
    s = resolveRemoteWins(s, '/a', 'local', 'base', 'remote');
    expect(s.resolutions[0].finalValue).toBe('remote');
  });

  it('should resolve merge', () => {
    let s = createConflictResolverState();
    s = resolveMerge(s, '/a', 'local', 'base', 'remote', 'merged');
    expect(s.resolutions[0].finalValue).toBe('merged');
  });

  it('should mark manual', () => {
    let s = createConflictResolverState();
    s = markManual(s, '/a', 'local', 'base', 'remote');
    expect(s.manualPending).toBe(1);
  });

  it('should 3-way merge with same local/remote', () => {
    expect(threeWayMerge('base', 'same', 'same')).toBe('same');
  });

  it('should 3-way merge with base==local', () => {
    expect(threeWayMerge('base', 'base', 'remote')).toBe('remote');
  });

  it('should 3-way merge with base==remote', () => {
    expect(threeWayMerge('base', 'local', 'base')).toBe('local');
  });

  it('should 3-way merge with both changed', () => {
    const result = threeWayMerge('base', 'local', 'remote');
    expect(result).toContain('LOCAL:local');
    expect(result).toContain('REMOTE:remote');
  });

  it('should get resolution for path', () => {
    let s = createConflictResolverState();
    s = resolveLocalWins(s, '/a', 'l', 'b', 'r');
    expect(getResolutionForPath(s, '/a')!.resolution).toBe('local_wins');
  });

  it('should get manual pending', () => {
    let s = createConflictResolverState();
    s = markManual(s, '/a', 'l', 'b', 'r');
    expect(getManualPending(s)).toHaveLength(1);
  });

  it('should clear resolutions', () => {
    let s = createConflictResolverState();
    s = resolveLocalWins(s, '/a', 'l', 'b', 'r');
    s = clearResolutions(s);
    expect(s.resolutions).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createConflictResolverState();
    s = resolveLocalWins(s, '/a', 'l', 'b', 'r');
    s = resolveRemoteWins(s, '/b', 'l', 'b', 'r');
    const r = getResolverReport(s);
    expect(r.total).toBe(2);
    expect(r.byResolution.local_wins).toBe(1);
  });
});
