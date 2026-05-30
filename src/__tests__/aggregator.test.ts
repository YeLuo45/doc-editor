/**
 * Aggregator Tests - V104 for doc-editor
 * Comprehensive test suite with 27+ tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Aggregator, AggregatorItem } from '../aggregator/Aggregator';
import { AggregationStrategy } from '../aggregator/AggregationStrategy';
import { AggregationMonitor } from '../aggregator/AggregationMonitor';
import { AggregationRegistry } from '../aggregator/AggregationRegistry';

describe('Aggregator', () => {
  let aggregator: Aggregator;

  beforeEach(() => {
    aggregator = new Aggregator({ name: 'test-aggregator' });
  });

  it('should create Aggregator with default config', () => {
    expect(aggregator).toBeDefined();
    expect(aggregator.config.name).toBe('test-aggregator');
  });

  it('should aggregate items', () => {
    const item: AggregatorItem = { id: '1', data: 'test', timestamp: Date.now() };
    expect(aggregator.aggregate(item)).toBe(true);
    expect(aggregator.size()).toBe(1);
  });

  it('should add items with automatic timestamp', () => {
    expect(aggregator.add({ id: '1', data: 'test' })).toBe(true);
    expect(aggregator.size()).toBe(1);
  });

  it('should remove items by id', () => {
    aggregator.add({ id: '1', data: 'test' });
    expect(aggregator.remove('1')).toBe(true);
    expect(aggregator.size()).toBe(0);
  });

  it('should get result as array', () => {
    aggregator.add({ id: '1', data: 'test1' });
    aggregator.add({ id: '2', data: 'test2' });
    const result = aggregator.getResult();
    expect(result).toHaveLength(2);
  });

  it('should get stats', () => {
    aggregator.add({ id: '1', data: 'test' });
    const stats = aggregator.getStats();
    expect(stats.totalItems).toBe(1);
    expect(stats.processedItems).toBe(1);
  });

  it('should get snapshot with metrics', () => {
    const snapshot = aggregator.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalItems');
  });

  it('should reset all data', () => {
    aggregator.add({ id: '1', data: 'test' });
    aggregator.reset();
    expect(aggregator.size()).toBe(0);
    const stats = aggregator.getStats();
    expect(stats.totalItems).toBe(0);
  });

  it('should generate report', () => {
    aggregator.add({ id: '1', data: 'test' });
    const report = aggregator.getReport();
    expect(report).toContain('test-aggregator');
    expect(report).toContain('totalItems');
  });

  it('should export metrics with version', () => {
    const exported = aggregator.exportMetrics();
    expect(exported).toHaveProperty('version', '1.0.4');
  });

  it('should check if item exists', () => {
    aggregator.add({ id: '1', data: 'test' });
    expect(aggregator.has('1')).toBe(true);
    expect(aggregator.has('2')).toBe(false);
  });

  it('should get single item by id', () => {
    aggregator.add({ id: '1', data: 'test' });
    const item = aggregator.get('1');
    expect(item).toBeDefined();
    expect(item?.data).toBe('test');
  });
});

describe('AggregationStrategy', () => {
  let strategy: AggregationStrategy;

  beforeEach(() => {
    strategy = new AggregationStrategy({ strategy: 'sum' });
  });

  it('should create AggregationStrategy', () => {
    expect(strategy).toBeDefined();
    expect(strategy.config.strategy).toBe('sum');
  });

  it('should aggregate items', () => {
    strategy.aggregate({ id: '1', value: 10, timestamp: Date.now() });
    expect(strategy.getItems()).toHaveLength(1);
  });

  it('should select strategy', () => {
    strategy.select('average');
    expect(strategy.getStrategy()).toBe('average');
  });

  it('should apply sum strategy', () => {
    strategy.aggregate({ id: '1', value: 10, timestamp: Date.now() });
    strategy.aggregate({ id: '2', value: 20, timestamp: Date.now() });
    expect(strategy.apply()).toBe(30);
  });

  it('should apply average strategy', () => {
    strategy.select('average');
    strategy.aggregate({ id: '1', value: 10, timestamp: Date.now() });
    strategy.aggregate({ id: '2', value: 20, timestamp: Date.now() });
    expect(strategy.apply()).toBe(15);
  });

  it('should apply min strategy', () => {
    strategy.select('min');
    strategy.aggregate({ id: '1', value: 30, timestamp: Date.now() });
    strategy.aggregate({ id: '2', value: 10, timestamp: Date.now() });
    expect(strategy.apply()).toBe(10);
  });

  it('should apply max strategy', () => {
    strategy.select('max');
    strategy.aggregate({ id: '1', value: 30, timestamp: Date.now() });
    strategy.aggregate({ id: '2', value: 10, timestamp: Date.now() });
    expect(strategy.apply()).toBe(30);
  });

  it('should get stats', () => {
    strategy.aggregate({ id: '1', value: 10, timestamp: Date.now() });
    strategy.apply();
    const stats = strategy.getStats();
    expect(stats.invocations).toBe(1);
    expect(stats.totalItems).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = strategy.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset', () => {
    strategy.aggregate({ id: '1', value: 10, timestamp: Date.now() });
    strategy.reset();
    expect(strategy.getItems()).toHaveLength(0);
  });

  it('should export metrics with version', () => {
    const exported = strategy.exportMetrics();
    expect(exported).toHaveProperty('version', '1.0.4');
  });
});

describe('AggregationMonitor', () => {
  let monitor: AggregationMonitor;

  beforeEach(() => {
    monitor = new AggregationMonitor({ enableHistory: true, trackLatency: true });
  });

  it('should create AggregationMonitor', () => {
    expect(monitor).toBeDefined();
  });

  it('should track metrics', () => {
    monitor.track({ name: 'test', value: 100 });
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
  });

  it('should track latency', () => {
    monitor.trackLatency(50);
    monitor.trackLatency(100);
    expect(monitor.getAverageLatency()).toBe(75);
  });

  it('should get history', () => {
    monitor.track({ name: 'test', value: 100 });
    const history = monitor.getHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status).toHaveProperty('active');
    expect(status.active).toBe(true);
  });

  it('should get snapshot', () => {
    monitor.track({ name: 'test', value: 100 });
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset', () => {
    monitor.track({ name: 'test', value: 100 });
    monitor.reset();
    expect(monitor.getMetrics()).toHaveLength(0);
  });

  it('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported).toHaveProperty('version', '1.0.4');
  });

  it('should get recent metrics', () => {
    monitor.track({ name: 'test1', value: 100 });
    monitor.track({ name: 'test2', value: 200 });
    const recent = monitor.getRecentMetrics(1);
    expect(recent).toHaveLength(1);
  });
});

describe('AggregationRegistry', () => {
  let registry: AggregationRegistry;

  beforeEach(() => {
    registry = new AggregationRegistry({ namespace: 'test' });
  });

  it('should create AggregationRegistry', () => {
    expect(registry).toBeDefined();
    expect(registry.config.namespace).toBe('test');
  });

  it('should register entries', () => {
    expect(registry.register('1', 'entry1', { data: 'test' })).toBe(true);
    expect(registry.size()).toBe(1);
  });

  it('should unregister entries', () => {
    registry.register('1', 'entry1', { data: 'test' });
    expect(registry.unregister('1')).toBe(true);
    expect(registry.size()).toBe(0);
  });

  it('should get entry by id', () => {
    registry.register('1', 'entry1', { data: 'test' });
    const entry = registry.get('1');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('entry1');
  });

  it('should get all entries', () => {
    registry.register('1', 'entry1', { data: 'test1' });
    registry.register('2', 'entry2', { data: 'test2' });
    const entries = registry.getAll();
    expect(entries).toHaveLength(2);
  });

  it('should check if entry exists', () => {
    registry.register('1', 'entry1', { data: 'test' });
    expect(registry.has('1')).toBe(true);
    expect(registry.has('2')).toBe(false);
  });

  it('should get stats', () => {
    registry.register('1', 'entry1', { data: 'test' });
    const stats = registry.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.activeEntries).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset', () => {
    registry.register('1', 'entry1', { data: 'test' });
    registry.reset();
    expect(registry.size()).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = registry.exportMetrics();
    expect(exported).toHaveProperty('version', '1.0.4');
  });

  it('should get entries by name', () => {
    registry.register('1', 'same', { data: 'test1' });
    registry.register('2', 'same', { data: 'test2' });
    const entries = registry.getEntriesByName('same');
    expect(entries).toHaveLength(2);
  });

  it('should prevent duplicate registration with validation', () => {
    const regWithValidation = new AggregationRegistry({ enableValidation: true });
    regWithValidation.register('1', 'entry1', { data: 'test' });
    expect(regWithValidation.register('1', 'entry1', { data: 'test' })).toBe(false);
  });

  it('should limit entries with maxEntries', () => {
    const regWithLimit = new AggregationRegistry({ maxEntries: 2 });
    expect(regWithLimit.register('1', 'entry1', { data: 'test' })).toBe(true);
    expect(regWithLimit.register('2', 'entry2', { data: 'test' })).toBe(true);
    expect(regWithLimit.register('3', 'entry3', { data: 'test' })).toBe(false);
  });
});