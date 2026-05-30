/**
 * V138 Projector Tests
 * Comprehensive tests for all projector components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Projector,
  ProjectorRegistry,
  ProjectorExecutor,
  ProjectorMonitor,
} from '../projector';

describe('Projector', () => {
  let projector: Projector;

  beforeEach(() => {
    projector = new Projector({
      id: 'test-projector',
      name: 'Test Projector',
      enabled: true,
      timeout: 5000,
      maxRetries: 3,
    });
  });

  it('should create projector with correct config', () => {
    expect(projector.config.id).toBe('test-projector');
    expect(projector.config.name).toBe('Test Projector');
    expect(projector.config.enabled).toBe(true);
  });

  it('should project input successfully', () => {
    const result = projector.project({ data: 'test' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should track projection stats', () => {
    projector.project({ data: 'test1' });
    projector.project({ data: 'test2' });
    const stats = projector.getStats();
    expect(stats.totalProjections).toBe(2);
    expect(stats.successfulProjections).toBe(2);
  });

  it('should fail projection when disabled', () => {
    const disabledProjector = new Projector({
      id: 'disabled',
      name: 'Disabled',
      enabled: false,
      timeout: 5000,
      maxRetries: 1,
    });
    const result = disabledProjector.project({ data: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('should getSnapshot with metrics and config', () => {
    projector.project({ data: 'test' });
    const snapshot = projector.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
    expect(snapshot.lastResult).toBeDefined();
  });

  it('should reset stats correctly', () => {
    projector.project({ data: 'test' });
    projector.reset();
    const stats = projector.getStats();
    expect(stats.totalProjections).toBe(0);
    expect(stats.successfulProjections).toBe(0);
  });

  it('should generate getReport string', () => {
    projector.project({ data: 'test' });
    const report = projector.getReport();
    expect(report).toContain('Projector Report');
    expect(report).toContain('Test Projector');
  });

  it('should exportMetrics with version', () => {
    const metrics = projector.exportMetrics();
    expect(metrics.version).toBe('V138');
    expect(metrics.stats).toBeDefined();
    expect(metrics.config).toBeDefined();
  });

  it('should getProjector by id', () => {
    const found = projector.getProjector('test-projector');
    expect(found).toBe(projector);
  });

  it('should return null for different projector id', () => {
    const found = projector.getProjector('other-id');
    expect(found).toBeNull();
  });
});

describe('ProjectorRegistry', () => {
  let registry: ProjectorRegistry;
  let projector: Projector;

  beforeEach(() => {
    registry = new ProjectorRegistry();
    projector = new Projector({
      id: 'reg-test',
      name: 'Registry Test',
      enabled: true,
      timeout: 5000,
      maxRetries: 3,
    });
  });

  it('should register projector', () => {
    const result = registry.register(projector);
    expect(result).toBe(true);
    expect(registry.has('reg-test')).toBe(true);
  });

  it('should not register duplicate projector', () => {
    registry.register(projector);
    const result = registry.register(projector);
    expect(result).toBe(false);
  });

  it('should unregister projector', () => {
    registry.register(projector);
    const removed = registry.unregister('reg-test');
    expect(removed).toBe(true);
    expect(registry.has('reg-test')).toBe(false);
  });

  it('should get projector by id', () => {
    registry.register(projector);
    const found = registry.get('reg-test');
    expect(found).toBe(projector);
  });

  it('should getAll projectors', () => {
    registry.register(projector);
    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toBe(projector);
  });

  it('should track lookup hits and misses', () => {
    registry.register(projector);
    registry.get('reg-test');
    registry.get('non-existent');
    const stats = registry.getStats();
    expect(stats.lookupHits).toBe(1);
    expect(stats.lookupMisses).toBe(1);
  });

  it('should clear all projectors', () => {
    registry.register(projector);
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('should reset stats', () => {
    registry.register(projector);
    registry.get('reg-test');
    registry.reset();
    const stats = registry.getStats();
    expect(stats.registeredCount).toBe(0);
  });

  it('should getSnapshot with metrics', () => {
    registry.register(projector);
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
    expect(snapshot.projectorIds).toContain('reg-test');
  });

  it('should exportMetrics with version', () => {
    registry.register(projector);
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V138');
  });

  it('should getReport string', () => {
    registry.register(projector);
    const report = registry.getReport();
    expect(report).toContain('ProjectorRegistry Report');
  });
});

describe('ProjectorExecutor', () => {
  let registry: ProjectorRegistry;
  let executor: ProjectorExecutor;
  let projector: Projector;

  beforeEach(() => {
    registry = new ProjectorRegistry();
    projector = new Projector({
      id: 'exec-test',
      name: 'Executor Test',
      enabled: true,
      timeout: 5000,
      maxRetries: 3,
    });
    registry.register(projector);
    executor = new ProjectorExecutor(registry);
  });

  it('should execute on registered projector', async () => {
    const result = await executor.execute('exec-test', { data: 'test' });
    expect(result.success).toBe(true);
    expect(result.projectorId).toBe('exec-test');
  });

  it('should fail on non-existent projector', async () => {
    const result = await executor.execute('non-existent', { data: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should track execution stats', async () => {
    await executor.execute('exec-test', { data: 'test' });
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  it('should run multiple projectors', async () => {
    const projector2 = new Projector({
      id: 'exec-test-2',
      name: 'Executor Test 2',
      enabled: true,
      timeout: 5000,
      maxRetries: 3,
    });
    registry.register(projector2);
    const results = await executor.run(['exec-test', 'exec-test-2'], { data: 'test' });
    expect(results).toHaveLength(2);
  });

  it('should getResults', async () => {
    await executor.execute('exec-test', { data: 'test' });
    const results = executor.getResults();
    expect(results).toHaveLength(1);
  });

  it('should getSnapshot with metrics', async () => {
    await executor.execute('exec-test', { data: 'test' });
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should reset stats', async () => {
    await executor.execute('exec-test', { data: 'test' });
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  it('should exportMetrics with version', async () => {
    await executor.execute('exec-test', { data: 'test' });
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V138');
  });

  it('should getReport string', async () => {
    await executor.execute('exec-test', { data: 'test' });
    const report = executor.getReport();
    expect(report).toContain('ProjectorExecutor Report');
  });
});

describe('ProjectorMonitor', () => {
  let registry: ProjectorRegistry;
  let executor: ProjectorExecutor;
  let monitor: ProjectorMonitor;
  let projector: Projector;

  beforeEach(() => {
    registry = new ProjectorRegistry();
    projector = new Projector({
      id: 'mon-test',
      name: 'Monitor Test',
      enabled: true,
      timeout: 5000,
      maxRetries: 3,
    });
    registry.register(projector);
    executor = new ProjectorExecutor(registry);
    monitor = new ProjectorMonitor(registry, executor);
  });

  it('should track metrics', () => {
    monitor.track('mon-test', { name: 'test-metric', value: 100 });
    const metrics = monitor.getMetrics('mon-test');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test-metric');
  });

  it('should getMetrics by projector id', () => {
    monitor.track('mon-test', { name: 'test', value: 50 });
    monitor.track('other', { name: 'test', value: 50 });
    const metrics = monitor.getMetrics('mon-test');
    expect(metrics).toHaveLength(1);
  });

  it('should getHistory', async () => {
    const result = await executor.execute('mon-test', { data: 'test' });
    monitor.recordExecution(result);
    const history = monitor.getHistory();
    expect(history).toHaveLength(1);
  });

  it('should getStatus', () => {
    const status = monitor.getStatus('mon-test');
    expect(['healthy', 'degraded', 'critical']).toContain(status);
  });

  it('should performHealthCheck', () => {
    const statuses = monitor.performHealthCheck();
    expect(statuses.has('mon-test')).toBe(true);
  });

  it('should recordExecution', async () => {
    const result = await executor.execute('mon-test', { data: 'test' });
    monitor.recordExecution(result);
    const history = monitor.getHistory('mon-test');
    expect(history).toHaveLength(1);
  });

  it('should getSnapshot with metrics', () => {
    monitor.track('mon-test', { name: 'test', value: 100 });
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should reset stats', () => {
    monitor.track('mon-test', { name: 'test', value: 100 });
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(0);
  });

  it('should exportMetrics with version', () => {
    monitor.track('mon-test', { name: 'test', value: 100 });
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V138');
  });

  it('should getReport string', () => {
    monitor.track('mon-test', { name: 'test', value: 100 });
    const report = monitor.getReport();
    expect(report).toContain('ProjectorMonitor Report');
  });
});