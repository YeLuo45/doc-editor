import { describe, it, expect } from 'vitest';
import {
  createPerfRetentionState, setPolicy, addItem, pruneExpired, pruneExcess,
  getItemsByPolicy, getItem, clearItems, getPerfRetentionReport,
} from '../../perf/V263-PerfRetention';

describe('V263 PerfRetention', () => {
  it('should create empty state', () => {
    const s = createPerfRetentionState();
    expect(s.items.size).toBe(0);
  });

  it('should set policy', () => {
    let s = createPerfRetentionState();
    s = setPolicy(s, { name: 'metrics', maxAgeMs: 1000, maxItems: 100 });
    expect(s.policies.size).toBe(1);
  });

  it('should add item', () => {
    const s = createPerfRetentionState();
    const r = addItem(s, 'metrics', { fps: 60 });
    expect(r.state.items.size).toBe(1);
  });

  it('should prune expired', () => {
    let s = createPerfRetentionState();
    s = setPolicy(s, { name: 'm', maxAgeMs: 10, maxItems: 100 });
    s = addItem(s, 'm', {}).state;
    s = pruneExpired(s, Date.now() + 100);
    expect(s.items.size).toBe(0);
  });

  it('should not prune within age', () => {
    let s = createPerfRetentionState();
    s = setPolicy(s, { name: 'm', maxAgeMs: 10000, maxItems: 100 });
    s = addItem(s, 'm', {}).state;
    s = pruneExpired(s, Date.now());
    expect(s.items.size).toBe(1);
  });

  it('should prune excess items', () => {
    let s = createPerfRetentionState();
    s = setPolicy(s, { name: 'm', maxAgeMs: 100000, maxItems: 3 });
    for (let i = 0; i < 5; i++) s = addItem(s, 'm', { i }).state;
    s = pruneExcess(s);
    expect(s.items.size).toBe(3);
  });

  it('should get items by policy', () => {
    let s = createPerfRetentionState();
    s = addItem(s, 'a', {}).state;
    s = addItem(s, 'b', {}).state;
    s = addItem(s, 'a', {}).state;
    expect(getItemsByPolicy(s, 'a')).toHaveLength(2);
  });

  it('should get item by id', () => {
    let s = createPerfRetentionState();
    const r = addItem(s, 'a', {});
    s = r.state;
    expect(getItem(s, r.itemId)).toBeDefined();
  });

  it('should clear items', () => {
    let s = createPerfRetentionState();
    s = addItem(s, 'a', {}).state;
    s = clearItems(s);
    expect(s.items.size).toBe(0);
  });

  it('should track pruned count', () => {
    let s = createPerfRetentionState();
    s = setPolicy(s, { name: 'm', maxAgeMs: 10, maxItems: 100 });
    s = addItem(s, 'm', {}).state;
    s = pruneExpired(s, Date.now() + 100);
    expect(s.totalPruned).toBe(1);
  });

  it('should produce report', () => {
    let s = createPerfRetentionState();
    s = setPolicy(s, { name: 'm', maxAgeMs: 1000, maxItems: 100 });
    s = addItem(s, 'm', {}).state;
    const r = getPerfRetentionReport(s);
    expect(r.policies).toBe(1);
    expect(r.total).toBe(1);
  });
});
