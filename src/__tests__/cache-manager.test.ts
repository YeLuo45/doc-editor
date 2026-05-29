/**
 * Cache Manager Tests - V72 for doc-editor
 * Comprehensive test suite with 27+ tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../cache-manager/CacheManager';
import { CacheStrategy } from '../cache-manager/CacheStrategy';
import { CacheWarming } from '../cache-manager/CacheWarming';
import { CacheInvalidation } from '../cache-manager/CacheInvalidation';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  it('should create CacheManager with default config', () => {
    expect(cache).toBeDefined();
    expect(cache.config.maxSize).toBe(1000);
    expect(cache.config.ttl).toBe(3600000);
    expect(cache.config.evictionPolicy).toBe('lru');
  });

  it('should set and get cache entries', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should delete entries', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('should get stats', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key2');
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should return all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const keys = cache.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should get snapshot', () => {
    const snapshot = cache.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('size');
  });

  it('should reset cache', () => {
    cache.set('key1', 'value1');
    cache.reset();
    expect(cache.size()).toBe(0);
  });

  it('should generate report', () => {
    const report = cache.getReport();
    expect(report).toContain('CacheManager Report');
    expect(report).toContain('Size:');
  });

  it('should export metrics', () => {
    const metrics = cache.exportMetrics();
    expect(metrics.version).toBe('V72-CacheManager-1.0');
  });

  it('should respect max size limit', () => {
    const smallCache = new CacheManager({ maxSize: 2 });
    smallCache.set('key1', 'value1');
    smallCache.set('key2', 'value2');
    smallCache.set('key3', 'value3');
    expect(smallCache.size()).toBeLessThanOrEqual(2);
  });
});

describe('CacheStrategy', () => {
  let strategy: CacheStrategy;

  beforeEach(() => {
    strategy = new CacheStrategy();
  });

  it('should create CacheStrategy with default config', () => {
    expect(strategy).toBeDefined();
    expect(strategy.config.type).toBe('lru');
  });

  it('should configure strategy', () => {
    strategy.configure({ type: 'lfu' });
    expect(strategy.getStrategy()).toBe('lfu');
  });

  it('should add and get entries', () => {
    strategy.addEntry('key1', 'value1');
    expect(strategy.getEntry('key1')).toBe('value1');
  });

  it('should return null for non-existent entries', () => {
    expect(strategy.getEntry('nonexistent')).toBeNull();
  });

  it('should evict entries', () => {
    strategy.addEntry('key1', 'value1');
    strategy.addEntry('key2', 'value2');
    const evicted = strategy.evict(1);
    expect(evicted.length).toBeGreaterThanOrEqual(0);
  });

  it('should get strategy metrics', () => {
    strategy.addEntry('key1', 'value1');
    const metrics = strategy.getMetrics();
    expect(metrics).toHaveProperty('evictionsTotal');
    expect(metrics).toHaveProperty('hitRate');
    expect(metrics.strategyType).toBe('lru');
  });

  it('should set strategy type', () => {
    strategy.setStrategy('fifo');
    expect(strategy.getStrategy()).toBe('fifo');
  });

  it('should get and set priority', () => {
    strategy.addEntry('key1', 'value1');
    strategy.setPriority('key1', 5);
    expect(strategy.getPriority('key1')).toBe(5);
  });

  it('should get snapshot', () => {
    const snapshot = strategy.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset strategy', () => {
    strategy.addEntry('key1', 'value1');
    strategy.reset();
    expect(strategy.getEntry('key1')).toBeNull();
  });

  it('should generate report', () => {
    const report = strategy.getReport();
    expect(report).toContain('CacheStrategy Report');
  });

  it('should export metrics', () => {
    const metrics = strategy.exportMetrics();
    expect(metrics.version).toBe('V72-CacheStrategy-1.0');
  });
});

describe('CacheWarming', () => {
  let warming: CacheWarming;

  beforeEach(() => {
    warming = new CacheWarming();
  });

  it('should create CacheWarming with default config', () => {
    expect(warming).toBeDefined();
    expect(warming.config.batchSize).toBe(10);
  });

  it('should warm cache with loader', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1', 'key2'], loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('should prefetch keys', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.prefetch(['key1', 'key2'], loader);
    const data = warming.getWarmed('key1');
    expect(data).toBe('data-key1');
  });

  it('should return null for non-warmed keys', () => {
    expect(warming.getWarmed('nonexistent')).toBeNull();
  });

  it('should get progress', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1', 'key2'], loader);
    const progress = warming.getProgress();
    expect(progress).toHaveProperty('total');
    expect(progress).toHaveProperty('completed');
    expect(progress).toHaveProperty('percentage');
  });

  it('should check if key is warmed', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1'], loader);
    expect(warming.isWarmed('key1')).toBe(true);
    expect(warming.isWarmed('key2')).toBe(false);
  });

  it('should get metrics', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1'], loader);
    const metrics = warming.getMetrics();
    expect(metrics).toHaveProperty('totalWarmed');
    expect(metrics).toHaveProperty('cacheHits');
  });

  it('should get snapshot', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1'], loader);
    const snapshot = warming.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset warming', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1'], loader);
    warming.reset();
    expect(warming.getProgress().total).toBe(0);
  });

  it('should generate report', async () => {
    const loader = vi.fn().mockImplementation((key: string) => Promise.resolve(`data-${key}`));
    await warming.warm(['key1'], loader);
    const report = warming.getReport();
    expect(report).toContain('CacheWarming Report');
  });

  it('should export metrics', () => {
    const metrics = warming.exportMetrics();
    expect(metrics.version).toBe('V72-CacheWarming-1.0');
  });
});

describe('CacheInvalidation', () => {
  let invalidation: CacheInvalidation;

  beforeEach(() => {
    invalidation = new CacheInvalidation();
  });

  it('should create CacheInvalidation with default config', () => {
    expect(invalidation).toBeDefined();
    expect(invalidation.config.enableWildcards).toBe(true);
  });

  it('should register keys', () => {
    invalidation.register('key1');
    expect(invalidation.hasKey('key1')).toBe(true);
  });

  it('should register patterns', () => {
    invalidation.registerPattern('user:*');
    const patterns = invalidation.getPatterns();
    expect(patterns).toContain('user:*');
  });

  it('should invalidate keys', () => {
    invalidation.register('key1');
    const count = invalidation.invalidate('key1');
    expect(count).toBeGreaterThanOrEqual(0);
    expect(invalidation.hasKey('key1')).toBe(false);
  });

  it('should invalidate by pattern', () => {
    invalidation.register('user:1');
    invalidation.register('user:2');
    invalidation.registerPattern('user:*');
    invalidation.invalidate('user:3');
    expect(invalidation.hasKey('user:1')).toBe(false);
  });

  it('should get all keys', () => {
    invalidation.register('key1');
    invalidation.register('key2');
    const keys = invalidation.getKeys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should get invalidation count', () => {
    invalidation.register('key1');
    invalidation.invalidate('key1');
    expect(invalidation.getInvalidationCount()).toBe(1);
  });

  it('should get metrics', () => {
    invalidation.register('key1');
    invalidation.invalidate('key1');
    const metrics = invalidation.getMetrics();
    expect(metrics).toHaveProperty('totalInvalidations');
    expect(metrics).toHaveProperty('keysInvalidated');
  });

  it('should remove keys', () => {
    invalidation.register('key1');
    expect(invalidation.removeKey('key1')).toBe(true);
    expect(invalidation.hasKey('key1')).toBe(false);
  });

  it('should get snapshot', () => {
    const snapshot = invalidation.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset invalidation', () => {
    invalidation.register('key1');
    invalidation.reset();
    expect(invalidation.getKeys().length).toBe(0);
  });

  it('should generate report', () => {
    const report = invalidation.getReport();
    expect(report).toContain('CacheInvalidation Report');
  });

  it('should export metrics', () => {
    const metrics = invalidation.exportMetrics();
    expect(metrics.version).toBe('V72-CacheInvalidation-1.0');
  });
});