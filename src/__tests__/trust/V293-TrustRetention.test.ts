import { describe, it, expect } from 'vitest';
import {
  createTrustRetentionState, setRetentionPolicy, addTrustItem, pruneExpired, pruneExcess,
  getItemsByPolicy, getTrustItem, clearTrustItems, getTrustRetentionReport,
} from '../../trust/V293-TrustRetention';

describe('V293 TrustRetention', () => {
  it('should create empty state', () => {
    const s = createTrustRetentionState();
    expect(s.items.size).toBe(0);
  });

  it('should set policy', () => {
    let s = createTrustRetentionState();
    s = setRetentionPolicy(s, { name: 't', maxAgeMs: 1000, maxItems: 100 });
    expect(s.policies.size).toBe(1);
  });

  it('should add item', () => {
    const s = createTrustRetentionState();
    const r = addTrustItem(s, 't', { score: 0.9 });
    expect(r.state.items.size).toBe(1);
  });

  it('should prune expired', () => {
    let s = createTrustRetentionState();
    s = setRetentionPolicy(s, { name: 't', maxAgeMs: 10, maxItems: 100 });
    s = addTrustItem(s, 't', {}).state;
    s = pruneExpired(s, Date.now() + 100);
    expect(s.items.size).toBe(0);
  });

  it('should not prune within age', () => {
    let s = createTrustRetentionState();
    s = setRetentionPolicy(s, { name: 't', maxAgeMs: 10000, maxItems: 100 });
    s = addTrustItem(s, 't', {}).state;
    s = pruneExpired(s, Date.now());
    expect(s.items.size).toBe(1);
  });

  it('should prune excess', () => {
    let s = createTrustRetentionState();
    s = setRetentionPolicy(s, { name: 't', maxAgeMs: 100000, maxItems: 3 });
    for (let i = 0; i < 5; i++) s = addTrustItem(s, 't', { i }).state;
    s = pruneExcess(s);
    expect(s.items.size).toBe(3);
  });

  it('should get items by policy', () => {
    let s = createTrustRetentionState();
    s = addTrustItem(s, 'a', {}).state;
    s = addTrustItem(s, 'b', {}).state;
    expect(getItemsByPolicy(s, 'a')).toHaveLength(1);
  });

  it('should get item by id', () => {
    let s = createTrustRetentionState();
    const r = addTrustItem(s, 'a', {});
    s = r.state;
    expect(getTrustItem(s, r.itemId)).toBeDefined();
  });

  it('should clear items', () => {
    let s = createTrustRetentionState();
    s = addTrustItem(s, 'a', {}).state;
    s = clearTrustItems(s);
    expect(s.items.size).toBe(0);
  });

  it('should track pruned count', () => {
    let s = createTrustRetentionState();
    s = setRetentionPolicy(s, { name: 't', maxAgeMs: 10, maxItems: 100 });
    s = addTrustItem(s, 't', {}).state;
    s = pruneExpired(s, Date.now() + 100);
    expect(s.totalPruned).toBe(1);
  });

  it('should produce report', () => {
    let s = createTrustRetentionState();
    s = setRetentionPolicy(s, { name: 't', maxAgeMs: 1000, maxItems: 100 });
    s = addTrustItem(s, 't', {}).state;
    const r = getTrustRetentionReport(s);
    expect(r.policies).toBe(1);
    expect(r.total).toBe(1);
  });
});
