/**
 * storage-engine.test.ts - V68 Storage Engine Tests
 * Tests for StorageManager, StorageIndex, StorageCache, StorageQuota
 */

import { StorageManager } from '../storage-engine/StorageManager';
import { StorageIndex } from '../storage-engine/StorageIndex';
import { StorageCache } from '../storage-engine/StorageCache';
import { StorageQuota } from '../storage-engine/StorageQuota';

describe('V68 Storage Engine', () => {
  describe('StorageManager', () => {
    let manager: StorageManager;

    beforeEach(() => {
      manager = new StorageManager({ namespace: 'test' });
    });

    afterEach(() => {
      manager.reset();
    });

    test('store and retrieve data', () => {
      manager.store('key1', { name: 'test' });
      const result = manager.retrieve('key1');
      expect(result).toEqual({ name: 'test' });
    });

    test('retrieve non-existent key returns null', () => {
      const result = manager.retrieve('nonexistent');
      expect(result).toBeNull();
    });

    test('delete existing key', () => {
      manager.store('key1', 'value1');
      const deleted = manager.delete('key1');
      expect(deleted).toBe(true);
      expect(manager.retrieve('key1')).toBeNull();
    });

    test('delete non-existent key returns false', () => {
      const deleted = manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    test('clear removes all entries', () => {
      manager.store('key1', 'value1');
      manager.store('key2', 'value2');
      manager.clear();
      expect(manager.getKeys()).toHaveLength(0);
    });

    test('getKeys returns all stored keys', () => {
      manager.store('key1', 'value1');
      manager.store('key2', 'value2');
      const keys = manager.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    test('getSnapshot returns metrics', () => {
      manager.store('key1', 'value1');
      const snapshot = manager.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('entryCount');
      expect(snapshot.metrics.entryCount).toBe(1);
    });

    test('reset clears all data', () => {
      manager.store('key1', 'value1');
      manager.reset();
      expect(manager.getKeys()).toHaveLength(0);
    });

    test('getReport returns formatted string', () => {
      const report = manager.getReport();
      expect(report).toContain('StorageManager Report');
      expect(report).toContain('Namespace: test');
    });

    test('exportMetrics returns version', () => {
      const metrics = manager.exportMetrics();
      expect(metrics.version).toBe('v68-storage-engine');
    });

    test('store with invalid key throws error', () => {
      expect(() => manager.store('', 'value')).toThrow('Invalid key');
    });
  });

  describe('StorageIndex', () => {
    let index: StorageIndex;

    beforeEach(() => {
      index = new StorageIndex({ indexType: 'btree' });
    });

    afterEach(() => {
      index.reset();
    });

    test('index and lookup key', () => {
      index.index('testKey', [1, 2, 3]);
      const positions = index.lookup('testKey');
      expect(positions).toEqual([1, 2, 3]);
    });

    test('lookup non-existent key returns empty array', () => {
      const positions = index.lookup('nonexistent');
      expect(positions).toHaveLength(0);
    });

    test('build creates multiple indexes', () => {
      const keys = ['key1', 'key2'];
      const data = { key1: [1, 2], key2: [3, 4] };
      index.build(keys, data);
      expect(index.lookup('key1')).toEqual([1, 2]);
      expect(index.lookup('key2')).toEqual([3, 4]);
    });

    test('getIndexSize returns correct count', () => {
      index.index('key1', [1]);
      index.index('key2', [2]);
      expect(index.getIndexSize()).toBe(2);
    });

    test('remove deletes index entry', () => {
      index.index('key1', [1]);
      const removed = index.remove('key1');
      expect(removed).toBe(true);
      expect(index.lookup('key1')).toHaveLength(0);
    });

    test('getStats returns index statistics', () => {
      index.index('key1', [1, 2, 3]);
      const stats = index.getStats();
      expect(stats.totalKeys).toBe(1);
      expect(stats.totalPositions).toBe(3);
    });

    test('getSnapshot returns metrics', () => {
      const snapshot = index.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('indexType');
      expect(snapshot.metrics.indexType).toBe('btree');
    });

    test('reset clears all indexes', () => {
      index.index('key1', [1]);
      index.reset();
      expect(index.getIndexSize()).toBe(0);
    });

    test('getReport returns formatted string', () => {
      const report = index.getReport();
      expect(report).toContain('StorageIndex Report');
      expect(report).toContain('Index Type: btree');
    });

    test('exportMetrics returns version', () => {
      const metrics = index.exportMetrics();
      expect(metrics.version).toBe('v68-storage-engine');
    });

    test('index with empty key throws error', () => {
      expect(() => index.index('', [1])).toThrow('Index key cannot be empty');
    });
  });

  describe('StorageCache', () => {
    let cache: StorageCache;

    beforeEach(() => {
      cache = new StorageCache({ maxEntries: 3, ttlMs: 1000 });
    });

    afterEach(() => {
      cache.reset();
    });

    test('set and get value', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');
      expect(result).toBe('value1');
    });

    test('get non-existent key returns null', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('evict removes entry', () => {
      cache.set('key1', 'value1');
      const evicted = cache.evict('key1');
      expect(evicted).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    test('LRU eviction works', () => {
      cache.set('key1', 'v1');
      cache.set('key2', 'v2');
      cache.set('key3', 'v3');
      cache.set('key4', 'v4'); // should evict key1 (LRU)
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key4')).toBe('v4');
    });

    test('getCacheStats tracks hits and misses', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');
      const stats = cache.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    test('hit rate calculation', () => {
      cache.set('key1', 'v1');
      cache.get('key1');
      cache.get('key1');
      cache.get('nonexistent');
      const stats = cache.getCacheStats();
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    test('reset clears cache', () => {
      cache.set('key1', 'v1');
      cache.reset();
      expect(cache.get('key1')).toBeNull();
    });

    test('getReport returns formatted string', () => {
      const report = cache.getReport();
      expect(report).toContain('StorageCache Report');
      expect(report).toContain('Eviction Policy: lru');
    });

    test('exportMetrics returns version', () => {
      const metrics = cache.exportMetrics();
      expect(metrics.version).toBe('v68-storage-engine');
    });

    test('set with empty key throws error', () => {
      expect(() => cache.set('', 'value')).toThrow('Cache key cannot be empty');
    });
  });

  describe('StorageQuota', () => {
    let quota: StorageQuota;

    beforeEach(() => {
      quota = new StorageQuota({ maxQuota: 1000 });
    });

    afterEach(() => {
      quota.reset();
    });

    test('allocate and release quota', () => {
      const allocated = quota.allocate('id1', 100, 'owner1');
      expect(allocated).toBe(true);
      const usage = quota.getUsage();
      expect(usage.used).toBe(100);
      quota.release('id1');
      expect(quota.getUsage().used).toBe(0);
    });

    test('check verifies quota availability', () => {
      quota.allocate('id1', 500, 'owner1');
      expect(quota.check(600)).toBe(false);
      expect(quota.check(400)).toBe(true);
    });

    test('getQuota returns max quota', () => {
      expect(quota.getQuota()).toBe(1000);
    });

    test('getUsage returns usage statistics', () => {
      quota.allocate('id1', 200, 'owner1');
      const usage = quota.getUsage();
      expect(usage.used).toBe(200);
      expect(usage.available).toBe(800);
      expect(usage.allocations).toBe(1);
    });

    test('exceed quota throws on hard enforcement', () => {
      const hardQuota = new StorageQuota({ maxQuota: 100, enforcementLevel: 'hard' });
      expect(() => hardQuota.allocate('id1', 150, 'owner1')).toThrow('Quota exceeded');
    });

    test('soft enforcement returns false without throwing', () => {
      const result = quota.allocate('id1', 1500, 'owner1');
      expect(result).toBe(false);
    });

    test('release non-existent allocation returns false', () => {
      const released = quota.release('nonexistent');
      expect(released).toBe(false);
    });

    test('isWarningThreshold detects threshold', () => {
      quota.allocate('id1', 850, 'owner1'); // 85% of 1000
      expect(quota.isWarningThreshold()).toBe(true);
    });

    test('getSnapshot returns metrics', () => {
      quota.allocate('id1', 300, 'owner1');
      const snapshot = quota.getSnapshot();
      expect(snapshot.metrics.used).toBe(300);
      expect(snapshot.metrics.maxQuota).toBe(1000);
    });

    test('reset clears all allocations', () => {
      quota.allocate('id1', 100, 'owner1');
      quota.reset();
      expect(quota.getUsage().used).toBe(0);
      expect(quota.getUsage().allocations).toBe(0);
    });

    test('getReport returns formatted string', () => {
      const report = quota.getReport();
      expect(report).toContain('StorageQuota Report');
      expect(report).toContain('Max Quota: 1000');
    });

    test('exportMetrics returns version', () => {
      const metrics = quota.exportMetrics();
      expect(metrics.version).toBe('v68-storage-engine');
    });

    test('getAllocation retrieves allocation details', () => {
      quota.allocate('id1', 100, 'owner1', 3);
      const allocation = quota.getAllocation('id1');
      expect(allocation).not.toBeNull();
      expect(allocation?.size).toBe(100);
      expect(allocation?.owner).toBe('owner1');
    });

    test('listAllocations returns all allocations', () => {
      quota.allocate('id1', 100, 'owner1');
      quota.allocate('id2', 200, 'owner2');
      const list = quota.listAllocations();
      expect(list).toHaveLength(2);
    });

    test('allocate with invalid parameters throws error', () => {
      expect(() => quota.allocate('', 100, 'owner')).toThrow('Invalid allocation parameters');
      expect(() => quota.allocate('id1', 0, 'owner')).toThrow('Invalid allocation parameters');
    });
  });
});