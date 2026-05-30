/**
 * V109 Partitioner Tests
 * Test suite for Partitioner, PartitionStrategy, PartitionMonitor, and PartitionRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Partitioner, PartitionConfig } from '../partitioner/Partitioner';
import { PartitionStrategy, StrategyConfig } from '../partitioner/PartitionStrategy';
import { PartitionMonitor, MonitorConfig } from '../partitioner/PartitionMonitor';
import { PartitionRegistry, RegistryConfig } from '../partitioner/PartitionRegistry';

describe('Partitioner', () => {
  let partitioner: Partitioner;
  const config: PartitionConfig = {
    id: 'test-partitioner',
    name: 'Test Partitioner',
    maxSize: 10,
    enabled: true,
  };

  beforeEach(() => {
    partitioner = new Partitioner(config);
  });

  it('should create Partitioner with config', () => {
    expect(partitioner.config).toEqual(config);
  });

  it('should partition items into groups', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const partitions = partitioner.partition(items, 5);
    expect(partitions.length).toBeGreaterThan(0);
    partitions.forEach((p) => {
      expect(p.size).toBeLessThanOrEqual(5);
    });
  });

  it('should add a partition', () => {
    const partition = partitioner.add('p1', 'Partition 1', [1, 2, 3]);
    expect(partition.id).toBe('p1');
    expect(partition.size).toBe(3);
    expect(partitioner.getPartition('p1')).toBeDefined();
  });

  it('should throw when adding duplicate partition', () => {
    partitioner.add('p1', 'Partition 1');
    expect(() => partitioner.add('p1', 'Partition 1')).toThrow();
  });

  it('should remove a partition', () => {
    partitioner.add('p1', 'Partition 1');
    expect(partitioner.remove('p1')).toBe(true);
    expect(partitioner.getPartition('p1')).toBeUndefined();
  });

  it('should get partition stats', () => {
    partitioner.add('p1', 'Partition 1', [1, 2, 3]);
    partitioner.add('p2', 'Partition 2', [4, 5]);
    const stats = partitioner.getStats();
    expect(stats.totalPartitions).toBe(2);
    expect(stats.totalItems).toBe(5);
  });

  it('should get snapshot', () => {
    const snapshot = partitioner.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toEqual(config);
  });

  it('should reset partitions', () => {
    partitioner.add('p1', 'Partition 1');
    partitioner.reset();
    expect(partitioner.getStats().totalPartitions).toBe(0);
  });

  it('should generate report', () => {
    partitioner.add('p1', 'Partition 1', [1, 2]);
    const report = partitioner.getReport();
    expect(report).toContain('Partitioner Report');
    expect(report).toContain('p1');
  });

  it('should export metrics with version', () => {
    const metrics = partitioner.exportMetrics();
    expect(metrics.version).toBe('1.0.9');
    expect(metrics.timestamp).toBeDefined();
    expect(metrics.stats).toBeDefined();
  });
});

describe('PartitionStrategy', () => {
  let strategy: PartitionStrategy;
  const config: StrategyConfig = {
    type: 'round-robin',
    enabled: true,
  };

  beforeEach(() => {
    strategy = new PartitionStrategy(config);
  });

  it('should create PartitionStrategy with config', () => {
    expect(strategy.config).toEqual(config);
  });

  it('should partition items using round-robin', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const result = strategy.partition(items, 3);
    expect(result.size).toBe(3);
    const values = Array.from(result.values());
    expect(values[0].length).toBe(2);
    expect(values[1].length).toBe(2);
    expect(values[2].length).toBe(2);
  });

  it('should select a partition', () => {
    const partitions = ['p0', 'p1', 'p2'];
    const selected = strategy.select(1, partitions);
    expect(partitions).toContain(selected);
  });

  it('should get strategy type', () => {
    expect(strategy.getStrategy()).toBe('round-robin');
  });

  it('should apply strategy to items', () => {
    const items = [1, 2, 3, 4];
    const result = strategy.apply(items, 2);
    expect(result.size).toBe(2);
  });

  it('should get strategy stats', () => {
    const items = [1, 2, 3];
    strategy.partition(items, 2);
    const stats = strategy.getStats();
    expect(stats.totalStrategies).toBeGreaterThanOrEqual(0);
  });

  it('should get snapshot', () => {
    const snapshot = strategy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toEqual(config);
  });

  it('should reset strategy state', () => {
    strategy.reset();
    expect(strategy.getStats().totalStrategies).toBe(0);
  });

  it('should generate report', () => {
    const report = strategy.getReport();
    expect(report).toContain('Partition Strategy Report');
  });

  it('should export metrics with version', () => {
    const metrics = strategy.exportMetrics();
    expect(metrics.version).toBe('1.0.9');
  });
});

describe('PartitionMonitor', () => {
  let monitor: PartitionMonitor;
  const config: MonitorConfig = {
    interval: 1000,
    retentionPeriod: 60000,
    enabled: true,
    alertThreshold: 0.8,
  };

  beforeEach(() => {
    monitor = new PartitionMonitor(config);
  });

  it('should create PartitionMonitor with config', () => {
    expect(monitor.config).toEqual(config);
  });

  it('should track metrics for a partition', () => {
    monitor.track('p1', 10, 5);
    const metrics = monitor.getMetrics('p1');
    expect(metrics.length).toBe(1);
    expect(metrics[0].loadFactor).toBe(0.5);
  });

  it('should get metrics for specific partition', () => {
    monitor.track('p1', 10, 5);
    monitor.track('p2', 10, 8);
    const metrics = monitor.getMetrics('p1');
    expect(metrics.length).toBe(1);
  });

  it('should get metrics history', () => {
    monitor.track('p1', 10, 5);
    monitor.track('p1', 10, 6);
    const history = monitor.getHistory('p1');
    expect(history.length).toBe(2);
  });

  it('should get monitor status', () => {
    monitor.track('p1', 10, 5);
    const status = monitor.getStatus();
    expect(status.isHealthy).toBe(true);
    expect(status.totalMetrics).toBeGreaterThan(0);
  });

  it('should detect unhealthy when load factor exceeds threshold', () => {
    monitor.track('p1', 10, 9);
    const status = monitor.getStatus();
    expect(status.isHealthy).toBe(false);
  });

  it('should get monitor stats', () => {
    monitor.track('p1', 10, 5);
    const stats = monitor.getStats();
    expect(stats.trackedPartitions).toBe(1);
    expect(stats.totalMetricsCollected).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toEqual(config);
  });

  it('should reset metrics', () => {
    monitor.track('p1', 10, 5);
    monitor.reset();
    expect(monitor.getStats().totalMetricsCollected).toBe(0);
  });

  it('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('Partition Monitor Report');
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.9');
  });
});

describe('PartitionRegistry', () => {
  let registry: PartitionRegistry;
  const config: RegistryConfig = {
    autoCreate: true,
    maxPartitions: 100,
    enabled: true,
  };

  beforeEach(() => {
    registry = new PartitionRegistry(config);
  });

  it('should create PartitionRegistry with config', () => {
    expect(registry.config).toEqual(config);
  });

  it('should register a partition', () => {
    const partition = registry.register('p1', 'Partition 1', 'default', { key: 'value' });
    expect(partition.id).toBe('p1');
    expect(partition.metadata.key).toBe('value');
  });

  it('should throw when registering duplicate partition', () => {
    registry.register('p1', 'Partition 1');
    expect(() => registry.register('p1', 'Partition 1')).toThrow();
  });

  it('should throw when max partitions reached', () => {
    const smallRegistry = new PartitionRegistry({ ...config, maxPartitions: 2 });
    smallRegistry.register('p1', 'P1');
    smallRegistry.register('p2', 'P2');
    expect(() => smallRegistry.register('p3', 'P3')).toThrow();
  });

  it('should unregister a partition', () => {
    registry.register('p1', 'Partition 1');
    expect(registry.unregister('p1')).toBe(true);
    expect(registry.has('p1')).toBe(false);
  });

  it('should get a registered partition', () => {
    registry.register('p1', 'Partition 1');
    const partition = registry.get('p1');
    expect(partition).toBeDefined();
    expect(partition!.name).toBe('Partition 1');
  });

  it('should get all registered partitions', () => {
    registry.register('p1', 'P1');
    registry.register('p2', 'P2');
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should check if partition is registered', () => {
    registry.register('p1', 'Partition 1');
    expect(registry.has('p1')).toBe(true);
    expect(registry.has('p2')).toBe(false);
  });

  it('should update partition metadata', () => {
    registry.register('p1', 'Partition 1');
    const updated = registry.updateMetadata('p1', { newKey: 'newValue' });
    expect(updated).toBe(true);
    expect(registry.get('p1')!.metadata.newKey).toBe('newValue');
  });

  it('should deactivate a partition', () => {
    registry.register('p1', 'Partition 1');
    registry.deactivate('p1');
    expect(registry.get('p1')!.isActive).toBe(false);
  });

  it('should get registry stats', () => {
    registry.register('p1', 'P1', 'typeA');
    registry.register('p2', 'P2', 'typeA');
    registry.register('p3', 'P3', 'typeB');
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(3);
    expect(stats.byType.typeA).toBe(2);
    expect(stats.byType.typeB).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toEqual(config);
  });

  it('should reset registry', () => {
    registry.register('p1', 'Partition 1');
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  it('should generate report', () => {
    registry.register('p1', 'Partition 1');
    const report = registry.getReport();
    expect(report).toContain('Partition Registry Report');
    expect(report).toContain('p1');
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.9');
    expect(metrics.timestamp).toBeDefined();
  });
});