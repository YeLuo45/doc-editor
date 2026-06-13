import { describe, it, expect } from 'vitest';
import {
  createCacheState, setCache, getCache, deleteCache, invalidateByPrefix,
  clearCache, pruneExpired, getCacheReport,
} from '../../mind/V169-MindCacheLayer';

describe('V169 MindCacheLayer', () => {
  it('should create empty cache', () => {
    const c = createCacheState<number>();
    expect(c.entries.size).toBe(0);
  });

  it('should set and get value', () => {
    let c = createCacheState<number>();
    c = setCache(c, 'key1', 100);
    const { value, state } = getCache(c, 'key1');
    expect(value).toBe(100);
    expect(state.hits).toBe(1);
  });

  it('should miss on missing key', () => {
    let c = createCacheState<number>();
    const { value, state } = getCache(c, 'missing');
    expect(value).toBeUndefined();
    expect(state.misses).toBe(1);
  });

  it('should expire on TTL', async () => {
    let c = createCacheState<number>(100, 10);
    c = setCache(c, 'key', 1, 10);
    await new Promise(r => setTimeout(r, 20));
    const result = getCache(c, 'key');
    expect(result.value).toBeUndefined();
    expect(result.state.misses).toBe(1);
  });

  it('should delete entry', () => {
    let c = createCacheState<number>();
    c = setCache(c, 'key', 1);
    c = deleteCache(c, 'key');
    expect(c.entries.size).toBe(0);
  });

  it('should invalidate by prefix', () => {
    let c = createCacheState<number>();
    c = setCache(c, 'doc:1', 1);
    c = setCache(c, 'doc:2', 2);
    c = setCache(c, 'user:1', 10);
    c = invalidateByPrefix(c, 'doc:');
    expect(c.entries.size).toBe(1);
  });

  it('should clear cache', () => {
    let c = createCacheState<number>();
    c = setCache(c, 'k1', 1);
    c = setCache(c, 'k2', 2);
    c = clearCache(c);
    expect(c.entries.size).toBe(0);
  });

  it('should prune expired entries', async () => {
    let c = createCacheState<number>(100, 10);
    c = setCache(c, 'k1', 1, 10);
    c = setCache(c, 'k2', 2, 100000);
    await new Promise(r => setTimeout(r, 20));
    c = pruneExpired(c);
    expect(c.entries.size).toBe(1);
  });

  it('should evict LRU when at capacity', () => {
    let c = createCacheState<number>(3, 100000);
    c = setCache(c, 'k1', 1);
    c = setCache(c, 'k2', 2);
    c = setCache(c, 'k3', 3);
    c = getCache(c, 'k1').state; // touch k1
    c = setCache(c, 'k4', 4);
    expect(c.entries.has('k2')).toBe(false);
    expect(c.entries.has('k1')).toBe(true);
    expect(c.evictions).toBe(1);
  });

  it('should track hit rate', () => {
    let c = createCacheState<number>();
    c = setCache(c, 'k1', 1);
    c = getCache(c, 'k1').state;
    c = getCache(c, 'k1').state;
    c = getCache(c, 'missing').state;
    const r = getCacheReport(c);
    expect(r.hits).toBe(2);
    expect(r.misses).toBe(1);
    expect(r.hitRate).toBeCloseTo(0.666, 2);
  });
});
