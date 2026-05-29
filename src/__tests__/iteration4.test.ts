/**
 * iteration4.test.ts - V34 Iteration 4 Tests
 * Tests for Storage, Cache, Queue, and Logger modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Storage } from '../iteration4/Storage';
import { Cache } from '../iteration4/Cache';
import { Queue } from '../iteration4/Queue';
import { Logger } from '../iteration4/Logger';

describe('Storage Module', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  it('should save and load values', () => {
    storage.save('key1', 'value1');
    expect(storage.load('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(storage.load('nonexistent')).toBeUndefined();
  });

  it('should remove existing keys', () => {
    storage.save('key1', 'value1');
    expect(storage.remove('key1')).toBe(true);
    expect(storage.load('key1')).toBeUndefined();
  });

  it('should return false when removing non-existent keys', () => {
    expect(storage.remove('nonexistent')).toBe(false);
  });

  it('should get all keys', () => {
    storage.save('key1', 'value1');
    storage.save('key2', 'value2');
    const keys = storage.getKeys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should check key existence with has()', () => {
    storage.save('key1', 'value1');
    expect(storage.has('key1')).toBe(true);
    expect(storage.has('key2')).toBe(false);
  });

  it('should return correct snapshot', () => {
    storage.save('key1', 'value1');
    const snapshot = storage.getSnapshot();
    expect(snapshot.size).toBe(1);
    expect(snapshot.keys).toContain('key1');
    expect(snapshot.metrics.saves).toBe(1);
  });

  it('should reset all state', () => {
    storage.save('key1', 'value1');
    storage.reset();
    expect(storage.getKeys()).toHaveLength(0);
    expect(storage.load('key1')).toBeUndefined();
  });

  it('should export metrics', () => {
    storage.save('key1', 'value1');
    storage.load('key1');
    const metrics = storage.exportMetrics();
    expect(metrics.saves).toBe(1);
    expect(metrics.loads).toBe(1);
  });

  it('should generate report', () => {
    const report = storage.getReport();
    expect(report).toContain('Storage Report');
    expect(report).toContain('Saves: 0');
  });
});

describe('Cache Module', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache();
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should check key existence with has()', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should track hits and misses', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('nonexistent');
    const snapshot = cache.getSnapshot();
    expect(snapshot.metrics.hits).toBe(1);
    expect(snapshot.metrics.misses).toBe(1);
  });

  it('should track evictions on overwrite', () => {
    cache.set('key1', 'value1');
    cache.set('key1', 'value2');
    const snapshot = cache.getSnapshot();
    expect(snapshot.metrics.evictions).toBe(1);
  });

  it('should delete specific keys', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);
  });

  it('should return correct snapshot', () => {
    cache.set('key1', 'value1');
    const snapshot = cache.getSnapshot();
    expect(snapshot.size).toBe(1);
    expect(snapshot.keys).toContain('key1');
  });

  it('should reset all state', () => {
    cache.set('key1', 'value1');
    cache.reset();
    expect(cache.getSnapshot().size).toBe(0);
    expect(cache.getSnapshot().metrics.sets).toBe(0);
  });

  it('should calculate hit rate in report', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('nonexistent');
    const report = cache.getReport();
    expect(report).toContain('Hit Rate: 50.00%');
  });
});

describe('Queue Module', () => {
  let queue: Queue;

  beforeEach(() => {
    queue = new Queue({ maxSize: 3 });
  });

  it('should enqueue and dequeue items', () => {
    queue.enqueue('item1');
    expect(queue.dequeue()).toBe('item1');
  });

  it('should maintain FIFO order', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('third');
    expect(queue.dequeue()).toBe('first');
    expect(queue.dequeue()).toBe('second');
    expect(queue.dequeue()).toBe('third');
  });

  it('should peek without removing', () => {
    queue.enqueue('item1');
    expect(queue.peek()).toBe('item1');
    expect(queue.size()).toBe(1);
  });

  it('should track size correctly', () => {
    expect(queue.size()).toBe(0);
    queue.enqueue('item1');
    expect(queue.size()).toBe(1);
    queue.dequeue();
    expect(queue.size()).toBe(0);
  });

  it('should respect max size', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    queue.enqueue('item3');
    expect(queue.enqueue('item4')).toBe(false);
  });

  it('should detect underflow on empty dequeue', () => {
    queue.dequeue();
    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.underflows).toBe(1);
  });

  it('should check isEmpty correctly', () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue('item1');
    expect(queue.isEmpty()).toBe(false);
  });

  it('should check isFull correctly', () => {
    expect(queue.isFull()).toBe(false);
    queue.enqueue('item1');
    queue.enqueue('item2');
    queue.enqueue('item3');
    expect(queue.isFull()).toBe(true);
  });

  it('should clear all items', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    queue.clear();
    expect(queue.size()).toBe(0);
  });

  it('should return correct snapshot', () => {
    queue.enqueue('item1');
    queue.enqueue('item2');
    const snapshot = queue.getSnapshot();
    expect(snapshot.size).toBe(2);
    expect(snapshot.front).toBe('item1');
    expect(snapshot.rear).toBe('item2');
  });

  it('should reset all state', () => {
    queue.enqueue('item1');
    queue.reset();
    expect(queue.size()).toBe(0);
    expect(queue.getSnapshot().metrics.enqueues).toBe(0);
  });
});

describe('Logger Module', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(10);
  });

  it('should log info messages', () => {
    logger.log('Info message');
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Info message');
  });

  it('should log warning messages', () => {
    logger.warn('Warning message');
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('warn');
  });

  it('should log error messages', () => {
    logger.error('Error message');
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
  });

  it('should filter logs by level', () => {
    logger.log('Info');
    logger.warn('Warning');
    logger.error('Error');
    const errors = logger.getLogsByLevel('error');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Error');
  });

  it('should clear logs', () => {
    logger.log('Info');
    logger.clear();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('should respect max entries limit', () => {
    for (let i = 0; i < 15; i++) {
      logger.log(`Message ${i}`);
    }
    const logs = logger.getLogs();
    expect(logs).toHaveLength(10);
  });

  it('should include metadata', () => {
    logger.log('Info', { key: 'value' });
    const logs = logger.getLogs();
    expect(logs[0].meta).toEqual({ key: 'value' });
  });

  it('should return correct snapshot', () => {
    logger.log('Info');
    logger.warn('Warning');
    const snapshot = logger.getSnapshot();
    expect(snapshot.count).toBe(2);
    expect(snapshot.metrics.infoCount).toBe(1);
    expect(snapshot.metrics.warnCount).toBe(1);
  });

  it('should reset all state', () => {
    logger.log('Info');
    logger.reset();
    expect(logger.getLogs()).toHaveLength(0);
    expect(logger.getSnapshot().metrics.totalCount).toBe(0);
  });

  it('should track timestamps', () => {
    logger.log('Info');
    const metrics = logger.exportMetrics();
    expect(metrics.firstLog).not.toBeNull();
    expect(metrics.lastLog).not.toBeNull();
  });

  it('should generate report', () => {
    logger.log('Info');
    logger.warn('Warning');
    logger.error('Error');
    const report = logger.getReport();
    expect(report).toContain('Logger Report');
    expect(report).toContain('Info: 1');
    expect(report).toContain('Warn: 1');
    expect(report).toContain('Error: 1');
  });

  it('should call mock function via vi.fn', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});

describe('Integration Tests', () => {
  it('should work together: Storage + Cache', () => {
    const storage = new Storage();
    const cache = new Cache();
    storage.save('data', { items: [1, 2, 3] });
    cache.set('data', storage.load('data'));
    expect(cache.get('data')).toEqual({ items: [1, 2, 3] });
  });

  it('should work together: Queue processing with Logger', () => {
    const queue = new Queue();
    const logger = new Logger();
    queue.enqueue('task1');
    queue.enqueue('task2');
    while (queue.size() > 0) {
      const task = queue.dequeue();
      logger.log(`Processed: ${task}`);
    }
    expect(logger.getLogs()).toHaveLength(2);
  });

  it('should work together: Storage + Queue + Logger', () => {
    const storage = new Storage();
    const queue = new Queue();
    const logger = new Logger();
    storage.save('queue_items', ['a', 'b', 'c']);
    const items = storage.load<string[]>('queue_items') || [];
    items.forEach(item => queue.enqueue(item));
    expect(queue.size()).toBe(3);
    logger.log(`Queue size: ${queue.size()}`);
    expect(logger.getLogs()).toHaveLength(1);
  });

  it('should export metrics from all modules', () => {
    const storage = new Storage();
    const cache = new Cache();
    const queue = new Queue();
    const logger = new Logger();
    storage.save('key', 'value');
    cache.set('key', 'value');
    queue.enqueue('task');
    logger.log('message');
    const sMetrics = storage.exportMetrics();
    const cMetrics = cache.exportMetrics();
    const qMetrics = queue.exportMetrics();
    const lMetrics = logger.exportMetrics();
    expect(sMetrics.saves).toBe(1);
    expect(cMetrics.sets).toBe(1);
    expect(qMetrics.enqueues).toBe(1);
    expect(lMetrics.totalCount).toBe(1);
  });

  it('should reset all modules independently', () => {
    const storage = new Storage();
    const cache = new Cache();
    const queue = new Queue();
    const logger = new Logger();
    storage.save('key', 'value');
    cache.set('key', 'value');
    queue.enqueue('task');
    logger.log('message');
    storage.reset();
    cache.reset();
    queue.reset();
    logger.reset();
    expect(storage.getKeys()).toHaveLength(0);
    expect(cache.getSnapshot().size).toBe(0);
    expect(queue.size()).toBe(0);
    expect(logger.getLogs()).toHaveLength(0);
  });
});