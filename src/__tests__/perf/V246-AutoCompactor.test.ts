import { describe, it, expect } from 'vitest';
import {
  createCompactionState, compactContext, getCompaction, getRecentCompactions,
  getAverageCompressionRatio, clearCompactions, getCompactionReport,
} from '../../perf/V246-AutoCompactor';

describe('V246 AutoCompactor', () => {
  it('should create empty state', () => {
    const s = createCompactionState();
    expect(s.compactions).toHaveLength(0);
  });

  it('should compact long text', () => {
    const s = createCompactionState();
    const text = 'a'.repeat(2000);
    const r = compactContext(s, text);
    expect(r.result.compactedTokens).toBeLessThan(r.result.originalTokens);
    expect(r.result.compressionRatio).toBeLessThan(1);
  });

  it('should not compact short text', () => {
    const s = createCompactionState();
    const r = compactContext(s, 'short text', 200);
    expect(r.result.compressionRatio).toBe(1);
  });

  it('should preserve recent text', () => {
    const s = createCompactionState();
    const text = 'A'.repeat(2000) + 'RECENT_TAIL';
    const r = compactContext(s, text, 100, 0.5);
    expect(r.result.recentKept).toContain('RECENT_TAIL');
  });

  it('should get compaction by id', () => {
    let s = createCompactionState();
    const r = compactContext(s, 'a'.repeat(2000));
    s = r.state;
    expect(getCompaction(s, r.result.id)).toBeDefined();
  });

  it('should get recent compactions', () => {
    let s = createCompactionState();
    for (let i = 0; i < 20; i++) s = compactContext(s, 'a'.repeat(2000)).state;
    expect(getRecentCompactions(s, 5)).toHaveLength(5);
  });

  it('should get average compression ratio', () => {
    let s = createCompactionState();
    s = compactContext(s, 'a'.repeat(2000)).state;
    s = compactContext(s, 'b'.repeat(2000)).state;
    const ratio = getAverageCompressionRatio(s);
    expect(ratio).toBeGreaterThan(0);
  });

  it('should clear compactions', () => {
    let s = createCompactionState();
    s = compactContext(s, 'a'.repeat(2000)).state;
    s = clearCompactions(s);
    expect(s.compactions).toHaveLength(0);
  });

  it('should cap compactions at 100', () => {
    let s = createCompactionState();
    for (let i = 0; i < 150; i++) s = compactContext(s, 'a'.repeat(2000)).state;
    expect(s.compactions).toHaveLength(100);
  });

  it('should produce report with saved tokens', () => {
    let s = createCompactionState();
    s = compactContext(s, 'a'.repeat(2000)).state;
    const r = getCompactionReport(s);
    expect(r.savedTokens).toBeGreaterThan(0);
  });
});
