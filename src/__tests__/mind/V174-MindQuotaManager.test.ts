/**
 * V174 MindQuotaManager Tests - Direction A Writing Mind (Iter 20/30)
 */
import { describe, it, expect } from 'vitest';
import {
  createQuotaState, consumeQuota, setLimit, resetQuota,
  getRemaining, getUsagePercent, getQuotaReport, clearQuota,
} from '../../mind/V174-MindQuotaManager';

describe('V174 MindQuotaManager', () => {
  it('should create state with default limits', () => {
    const s = createQuotaState();
    expect(s.limits).toHaveLength(5);
  });

  it('should consume quota', () => {
    let s = createQuotaState();
    const r = consumeQuota(s, 'tokens', 1000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(99000);
  });

  it('should reject when over limit', () => {
    let s = createQuotaState();
    s = setLimit(s, 'tokens', 100);
    const r = consumeQuota(s, 'tokens', 150);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(100);
    expect(r.state.violations).toHaveLength(1);
  });

  it('should set custom limit', () => {
    let s = createQuotaState();
    s = setLimit(s, 'cost', 50);
    const limit = s.limits.find(l => l.type === 'cost')!;
    expect(limit.limit).toBe(50);
  });

  it('should reset quota', () => {
    let s = createQuotaState();
    let r = consumeQuota(s, 'tokens', 5000);
    s = r.state;
    s = resetQuota(s, 'tokens');
    expect(getRemaining(s, 'tokens')).toBe(100000);
    expect(s.resets).toHaveLength(1);
  });

  it('should get remaining', () => {
    let s = createQuotaState();
    let r = consumeQuota(s, 'iterations', 50);
    s = r.state;
    expect(getRemaining(s, 'iterations')).toBe(150);
  });

  it('should get usage percent', () => {
    let s = createQuotaState();
    s = setLimit(s, 'cost', 100);
    let r = consumeQuota(s, 'cost', 25);
    s = r.state;
    expect(getUsagePercent(s, 'cost')).toBe(25);
  });

  it('should produce report', () => {
    const s = createQuotaState();
    const r = getQuotaReport(s);
    expect(r).toHaveLength(5);
    expect(r.find(x => x.type === 'tokens')).toBeDefined();
  });

  it('should clear state', () => {
    let s = createQuotaState();
    let r = consumeQuota(s, 'tokens', 100);
    s = r.state;
    s = clearQuota();
    expect(getRemaining(s, 'tokens')).toBe(100000);
  });

  it('should handle multiple consumption', () => {
    let s = createQuotaState();
    s = setLimit(s, 'iterations', 10);
    let r = consumeQuota(s, 'iterations', 5);
    s = r.state;
    r = consumeQuota(s, 'iterations', 3);
    s = r.state;
    r = consumeQuota(s, 'iterations', 5);
    expect(r.allowed).toBe(false);
  });

  it('should cap violations at 100', () => {
    let s = createQuotaState();
    s = setLimit(s, 'tokens', 10);
    for (let i = 0; i < 200; i++) {
      s = consumeQuota(s, 'tokens', 100).state;
    }
    expect(s.violations.length).toBeLessThanOrEqual(100);
  });
});
