/**
 * Cache Store Tests - V88 Cache Store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheStore } from '../cache-store/CacheStore';
import { CacheIndex } from '../cache-store/CacheIndex';
import { CachePolicy } from '../cache-store/CachePolicy';
import { CacheMonitor } from '../cache-store/CacheMonitor';

describe('CacheStore', () => {
  let store: CacheStore;

  beforeEach(() => {
    store = new CacheStore({
      maxSize: 100,
      ttl: 5000,
      enableCompression: false,
      enablePersistence: false,
      namespace: 'test'
    });
  });

  it('should create CacheStore instance', () => {
    expect(store).toBeDefined();
    expect(store.config.maxSize).toBe(100);
  });

  it('should set and get values', () => {
    store.set('key1', 'value1');
    expect(store.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(store.get('nonexistent')).toBeNull();
  });

  it('should check key existence with has()', () => {
    store.set('key1', 'value1');
    expect(store.has('key1')).toBe(true);
    expect(store.has('nonexistent')).toBe(false);
  });

  it('should delete keys', () => {
    store.set('key1', 'value1');
    expect(store.delete('key1')).toBe(true);
    expect(store.has('key1')).toBe(false);
  });

  it('should clear all keys', () => {
    store.set('key1', 'value1');
    store.set('key2', 'value2');
    store.clear();
    expect(store.keys().length).toBe(0);
  });

  it('should return all keys', () => {
    store.set('key1', 'value1');
    store.set('key2', 'value2');
    const keys = store.keys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should get snapshot with metrics', () => {
    store.set('key1', 'value1');
    const snapshot = store.getSnapshot();
    expect(snapshot.metrics.totalSets).toBe(1);
  });

  it('should reset store state', () => {
    store.set('key1', 'value1');
    store.reset();
    expect(store.keys().length).toBe(0);
  });

  it('should generate report string', () => {
    const report = store.getReport();
    expect(report).toContain('CacheStore Report');
    expect(report).toContain('test');
  });

  it('should export metrics with version', () => {
    const metrics = store.exportMetrics();
    expect(metrics.version).toBe('V88');
    expect(metrics.stats).toBeDefined();
  });
});

describe('CacheIndex', () => {
  let index: CacheIndex;

  beforeEach(() => {
    index = new CacheIndex({
      enableIndexing: true,
      maxIndices: 50,
      indexType: 'string',
      caseSensitive: false,
      namespace: 'test'
    });
  });

  it('should create CacheIndex instance', () => {
    expect(index).toBeDefined();
    expect(index.config.enableIndexing).toBe(true);
  });

  it('should index entries', () => {
    expect(index.index('key1', 'value1')).toBe(true);
  });

  it('should add entries', () => {
    expect(index.add('key1', 'value1')).toBe(true);
  });

  it('should remove entries', () => {
    index.add('key1', 'value1');
    expect(index.remove('key1')).toBe(true);
    expect(index.getIndex('key1').length).toBe(0);
  });

  it('should find entries by query', () => {
    index.add('key1', 'hello world');
    index.add('key2', 'world hello');
    const results = index.find('hello');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should get index entries', () => {
    index.add('key1', 'value1');
    const entries = index.getIndex('key1');
    expect(entries.length).toBe(1);
  });

  it('should get stats', () => {
    index.add('key1', 'value1');
    const stats = index.getStats();
    expect(stats.totalInserts).toBe(1);
  });

  it('should get snapshot with metrics', () => {
    const snapshot = index.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset index state', () => {
    index.add('key1', 'value1');
    index.reset();
    expect(index.getStats().totalIndices).toBe(0);
  });

  it('should generate report string', () => {
    const report = index.getReport();
    expect(report).toContain('CacheIndex Report');
  });

  it('should export metrics with version', () => {
    const metrics = index.exportMetrics();
    expect(metrics.version).toBe('V88');
  });
});

describe('CachePolicy', () => {
  let policy: CachePolicy;

  beforeEach(() => {
    policy = new CachePolicy({
      evictionPolicy: 'lru',
      maxMemory: 1000,
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
      autoEviction: true,
      namespace: 'test'
    });
  });

  it('should create CachePolicy instance', () => {
    expect(policy).toBeDefined();
    expect(policy.config.evictionPolicy).toBe('lru');
  });

  it('should apply policy and return status', () => {
    const result = policy.apply(500, 10);
    expect(typeof result).toBe('string');
  });

  it('should get policy configuration', () => {
    const p = policy.getPolicy();
    expect(p.config.evictionPolicy).toBe('lru');
    expect(p.status).toBe('active');
  });

  it('should evaluate policy conditions', () => {
    const result = policy.evaluate(800, 10);
    expect(result.shouldWarn).toBe(true);
  });

  it('should get stats', () => {
    policy.apply(500, 10);
    const stats = policy.getStats();
    expect(stats.currentMemory).toBe(500);
  });

  it('should get snapshot with metrics', () => {
    const snapshot = policy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset policy state', () => {
    policy.apply(500, 10);
    policy.reset();
    expect(policy.getStats().evictionCount).toBe(0);
  });

  it('should generate report string', () => {
    const report = policy.getReport();
    expect(report).toContain('CachePolicy Report');
  });

  it('should export metrics with version', () => {
    const metrics = policy.exportMetrics();
    expect(metrics.version).toBe('V88');
  });
});

describe('CacheMonitor', () => {
  let monitor: CacheMonitor;

  beforeEach(() => {
    monitor = new CacheMonitor({
      enableMonitoring: true,
      historySize: 100,
      samplingRate: 1.0,
      alertThreshold: 0.9,
      namespace: 'test'
    });
  });

  it('should create CacheMonitor instance', () => {
    expect(monitor).toBeDefined();
    expect(monitor.config.enableMonitoring).toBe(true);
  });

  it('should track metrics', () => {
    monitor.track('hit', 'key1', 5);
    const status = monitor.getStatus();
    expect(status.stats.totalHits).toBe(1);
  });

  it('should get metrics', () => {
    monitor.track('hit', 'key1');
    const metrics = monitor.getMetrics();
    expect(metrics.get('hits')).toBe(1);
  });

  it('should get history', () => {
    monitor.track('hit', 'key1');
    monitor.track('miss', 'key2');
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  it('should filter history by type', () => {
    monitor.track('hit', 'key1');
    monitor.track('miss', 'key2');
    const hits = monitor.getHistory('hit');
    expect(hits.length).toBe(1);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.status).toBe('active');
    expect(status.stats).toBeDefined();
  });

  it('should get snapshot with metrics', () => {
    monitor.track('set', 'key1');
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalSets).toBe(1);
  });

  it('should reset monitor state', () => {
    monitor.track('hit', 'key1');
    monitor.reset();
    expect(monitor.getStatus().stats.totalHits).toBe(0);
  });

  it('should generate report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('CacheMonitor Report');
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V88');
  });

  it('should clear history', () => {
    monitor.track('hit', 'key1');
    monitor.clearHistory();
    expect(monitor.getHistory().length).toBe(0);
  });
});