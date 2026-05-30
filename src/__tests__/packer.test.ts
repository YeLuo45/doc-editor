/**
 * V129 Packer Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Packer } from '../packer/Packer.js';
import { PackerRegistry } from '../packer/PackerRegistry.js';
import { PackerExecutor } from '../packer/PackerExecutor.js';
import { PackerMonitor } from '../packer/PackerMonitor.js';

describe('Packer', () => {
  let packer: Packer;

  beforeEach(() => {
    packer = new Packer({
      id: 'test-packer-1',
      name: 'Test Packer',
      version: '1.0.0',
    });
  });

  it('should create a packer with config', () => {
    expect(packer.getConfig().id).toBe('test-packer-1');
    expect(packer.getConfig().name).toBe('Test Packer');
  });

  it('should pack items successfully', () => {
    packer.add('item1', { data: 'test' });
    const result = packer.pack();
    expect(result.success).toBe(true);
    expect(result.packedSize).toBeGreaterThan(0);
  });

  it('should unpack items', () => {
    packer.add('item1', { data: 'test' });
    const result = packer.unpack();
    expect(result.success).toBe(true);
  });

  it('should add and remove items', () => {
    expect(packer.add('item1', { data: 'test' })).toBe(true);
    expect(packer.remove('item1')).toBe(true);
    expect(packer.remove('nonexistent')).toBe(false);
  });

  it('should get packer stats', () => {
    packer.add('item1', { data: 'test' });
    packer.pack();
    const stats = packer.getStats();
    expect(stats.packed).toBe(1);
    expect(stats.itemCount).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = packer.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.config).toBeDefined();
  });

  it('should reset packer state', () => {
    packer.add('item1', { data: 'test' });
    packer.pack();
    packer.reset();
    const stats = packer.getStats();
    expect(stats.packed).toBe(0);
    expect(stats.itemCount).toBe(0);
  });

  it('should generate report', () => {
    const report = packer.getReport();
    expect(report).toBeTruthy();
    expect(report.includes('test-packer-1')).toBe(true);
  });

  it('should export metrics', () => {
    packer.add('item1', { data: 'test' });
    packer.pack();
    const metrics = packer.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.packed).toBe(1);
  });
});

describe('PackerRegistry', () => {
  let registry: PackerRegistry;
  let packer: Packer;

  beforeEach(() => {
    registry = new PackerRegistry();
    packer = new Packer({
      id: 'test-packer-1',
      name: 'Test Packer',
      version: '1.0.0',
    });
  });

  it('should register a packer', () => {
    expect(registry.register('packer-1', packer)).toBe(true);
  });

  it('should not register duplicate packers by default', () => {
    registry.register('packer-1', packer);
    expect(registry.register('packer-1', packer)).toBe(false);
  });

  it('should unregister a packer', () => {
    registry.register('packer-1', packer);
    expect(registry.unregister('packer-1')).toBe(true);
    expect(registry.has('packer-1')).toBe(false);
  });

  it('should get a packer by id', () => {
    registry.register('packer-1', packer);
    const found = registry.get('packer-1');
    expect(found).toBe(packer);
  });

  it('should return null for nonexistent packer', () => {
    const found = registry.get('nonexistent');
    expect(found).toBeNull();
  });

  it('should get all packers', () => {
    registry.register('packer-1', packer);
    const anotherPacker = new Packer({ id: 'packer-2', name: 'Packer 2', version: '1.0.0' });
    registry.register('packer-2', anotherPacker);
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should check if packer has id', () => {
    registry.register('packer-1', packer);
    expect(registry.has('packer-1')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should get snapshot', () => {
    registry.register('packer-1', packer);
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.size).toBe(1);
  });

  it('should reset registry', () => {
    registry.register('packer-1', packer);
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  it('should export metrics', () => {
    registry.register('packer-1', packer);
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.data.size).toBe(1);
  });
});

describe('PackerExecutor', () => {
  let executor: PackerExecutor;
  let packer: Packer;

  beforeEach(() => {
    executor = new PackerExecutor();
    packer = new Packer({
      id: 'test-packer-1',
      name: 'Test Packer',
      version: '1.0.0',
    });
  });

  it('should execute packer successfully', async () => {
    const result = await executor.execute(packer);
    expect(result.success).toBe(true);
    expect(result.packerId).toBe('test-packer-1');
  });

  it('should run multiple packers', async () => {
    const packer2 = new Packer({ id: 'test-packer-2', name: 'Packer 2', version: '1.0.0' });
    const results = await executor.run([packer, packer2]);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should get execution results', async () => {
    await executor.execute(packer);
    const results = executor.getResults();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get execution stats', async () => {
    await executor.execute(packer);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successful).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset executor', async () => {
    await executor.execute(packer);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  it('should export metrics', async () => {
    await executor.execute(packer);
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('PackerMonitor', () => {
  let monitor: PackerMonitor;
  let packer: Packer;

  beforeEach(() => {
    monitor = new PackerMonitor();
    packer = new Packer({
      id: 'test-packer-1',
      name: 'Test Packer',
      version: '1.0.0',
    });
  });

  it('should track a packer', () => {
    expect(monitor.track(packer)).toBe(true);
  });

  it('should not track null packer', () => {
    expect(monitor.track(null as unknown as Packer)).toBe(false);
  });

  it('should get metrics', () => {
    monitor.track(packer);
    const metrics = monitor.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should get metrics for specific packer', () => {
    monitor.track(packer);
    const metrics = monitor.getMetrics('test-packer-1');
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should get history with limit', () => {
    monitor.track(packer);
    const history = monitor.getHistory(5);
    expect(history.length).toBeLessThanOrEqual(5);
  });

  it('should get status', () => {
    monitor.track(packer);
    const status = monitor.getStatus();
    expect(status.status).toBe('active');
    expect(status.trackedCount).toBe(1);
  });

  it('should pause and resume', () => {
    monitor.pause();
    expect(monitor.getStatus().status).toBe('paused');
    monitor.resume();
    expect(monitor.getStatus().status).toBe('active');
  });

  it('should get snapshot', () => {
    monitor.track(packer);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.trackedCount).toBe(1);
  });

  it('should reset monitor', () => {
    monitor.track(packer);
    monitor.reset();
    expect(monitor.getStatus().trackedCount).toBe(0);
  });

  it('should export metrics', () => {
    monitor.track(packer);
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.data.trackedCount).toBe(1);
  });
});