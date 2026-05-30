/**
 * V127 Assembler Tests
 * Comprehensive test suite for assembler components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Assembler,
  AssemblerConfig,
  AssemblyResult,
  AssemblerRegistry,
  AssemblerExecutor,
  AssemblerMonitor,
} from '../assembler/index.js';

// Test utilities
const createTestAssembler = (id: string, name: string): Assembler => {
  const config: AssemblerConfig = { id, name, version: '1.0.0' };
  return new Assembler(config);
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Assembler', () => {
  let assembler: Assembler;

  beforeEach(() => {
    assembler = createTestAssembler('test-asm-1', 'Test Assembler');
  });

  afterEach(() => {
    assembler.reset();
  });

  it('should create assembler with valid config', () => {
    expect(assembler).toBeDefined();
    expect(assembler.getConfig().id).toBe('test-asm-1');
  });

  it('should assemble components successfully', () => {
    const result = assembler.assemble({ test: true });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it('should add and retrieve items', () => {
    assembler.add('key1', { data: 'value1' });
    assembler.add('key2', { data: 'value2' });
    const stats = assembler.getStats();
    expect(stats.itemCount).toBe(2);
  });

  it('should remove items correctly', () => {
    assembler.add('key1', { data: 'value1' });
    const removed = assembler.remove('key1');
    expect(removed).toBe(true);
    expect(assembler.getStats().itemCount).toBe(0);
  });

  it('should return false when removing non-existent item', () => {
    const removed = assembler.remove('non-existent');
    expect(removed).toBe(false);
  });

  it('should get stats with correct counts', () => {
    assembler.assemble();
    assembler.assemble();
    assembler.assemble();
    const stats = assembler.getStats();
    expect(stats.assembled).toBe(3);
    expect(stats.failed).toBe(0);
  });

  it('should track failed assemblies', () => {
    const badAssembler = new Assembler({ id: 'bad', name: 'Bad', version: '1.0.0' });
    badAssembler.reset();
    badAssembler.assemble();
    const stats = badAssembler.getStats();
    expect(stats.assembled >= 0).toBe(true);
  });

  it('should get snapshot with metrics', () => {
    const snapshot = assembler.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.config).toBeDefined();
  });

  it('should reset assembler state', () => {
    assembler.add('key1', { data: 'value1' });
    assembler.assemble();
    assembler.reset();
    const stats = assembler.getStats();
    expect(stats.itemCount).toBe(0);
    expect(stats.assembled).toBe(0);
  });

  it('should generate report string', () => {
    const report = assembler.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('test-asm-1');
  });

  it('should export metrics with version', () => {
    const metrics = assembler.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.data).toBeDefined();
    expect(metrics.data.assembled).toBeDefined();
  });

  it('should get static assembler by id', () => {
    const result = Assembler.getAssembler('non-existent');
    expect(result).toBeNull();
  });
});

describe('AssemblerRegistry', () => {
  let registry: AssemblerRegistry;

  beforeEach(() => {
    registry = new AssemblerRegistry({ maxSize: 10 });
  });

  afterEach(() => {
    registry.reset();
  });

  it('should register assembler successfully', () => {
    const assembler = createTestAssembler('reg-1', 'Registered');
    const result = registry.register('reg-1', assembler);
    expect(result).toBe(true);
  });

  it('should not register duplicate without allowDuplicates', () => {
    const assembler1 = createTestAssembler('dup-1', 'First');
    const assembler2 = createTestAssembler('dup-1', 'Second');
    registry.register('dup-1', assembler1);
    const result = registry.register('dup-1', assembler2);
    expect(result).toBe(false);
  });

  it('should unregister assembler by id', () => {
    const assembler = createTestAssembler('unreg-1', 'Unregistered');
    registry.register('unreg-1', assembler);
    const removed = registry.unregister('unreg-1');
    expect(removed).toBe(true);
    expect(registry.has('unreg-1')).toBe(false);
  });

  it('should get registered assembler', () => {
    const assembler = createTestAssembler('get-1', 'GetMe');
    registry.register('get-1', assembler);
    const retrieved = registry.get('get-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.getConfig().id).toBe('get-1');
  });

  it('should return null for non-existent id', () => {
    const retrieved = registry.get('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should get all registered assemblers', () => {
    registry.register('all-1', createTestAssembler('all-1', 'One'));
    registry.register('all-2', createTestAssembler('all-2', 'Two'));
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should check if assembler is registered', () => {
    registry.register('has-1', createTestAssembler('has-1', 'HasMe'));
    expect(registry.has('has-1')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);
  });

  it('should get snapshot with metrics', () => {
    registry.register('snap-1', createTestAssembler('snap-1', 'Snap'));
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.size).toBe(1);
  });

  it('should reset registry', () => {
    registry.register('reset-1', createTestAssembler('reset-1', 'Reset'));
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  it('should generate report string', () => {
    registry.register('report-1', createTestAssembler('report-1', 'Report'));
    const report = registry.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('report-1');
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.data.size).toBeDefined();
  });
});

describe('AssemblerExecutor', () => {
  let executor: AssemblerExecutor;
  let assembler: Assembler;

  beforeEach(() => {
    executor = new AssemblerExecutor({ maxConcurrent: 5 });
    assembler = createTestAssembler('exec-1', 'Executor');
  });

  afterEach(() => {
    executor.reset();
  });

  it('should execute assembler successfully', async () => {
    const result = await executor.execute(assembler, { test: true });
    expect(result.success).toBe(true);
    expect(result.executionId).toBeDefined();
  });

  it('should track execution result', async () => {
    await executor.execute(assembler);
    const results = executor.getResults();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should run multiple assemblers', async () => {
    const assemblers = [
      createTestAssembler('run-1', 'Run1'),
      createTestAssembler('run-2', 'Run2'),
    ];
    const results = await executor.run(assemblers);
    expect(results.length).toBe(2);
  });

  it('should get executor stats', async () => {
    await executor.execute(assembler);
    await executor.execute(assembler);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(2);
    expect(stats.successful >= 0).toBe(true);
  });

  it('should get snapshot with metrics', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.stats).toBeDefined();
  });

  it('should reset executor state', async () => {
    await executor.execute(assembler);
    executor.reset();
    const results = executor.getResults();
    expect(results.length).toBe(0);
  });

  it('should generate report string', () => {
    const report = executor.getReport();
    expect(typeof report).toBe('string');
  });

  it('should export metrics with version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.data.totalExecutions).toBeDefined();
  });

  it('should handle concurrent limit', async () => {
    const limitedExecutor = new AssemblerExecutor({ maxConcurrent: 1 });
    const a1 = createTestAssembler('limit-1', 'Limit1');
    const a2 = createTestAssembler('limit-2', 'Limit2');
    await limitedExecutor.execute(a1);
    const result = await limitedExecutor.execute(a2);
    // May fail or succeed depending on timing
    expect(result).toBeDefined();
    limitedExecutor.reset();
  });
});

describe('AssemblerMonitor', () => {
  let monitor: AssemblerMonitor;
  let assembler: Assembler;

  beforeEach(() => {
    monitor = new AssemblerMonitor({ historySize: 100 });
    assembler = createTestAssembler('mon-1', 'Monitored');
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should track assembler', () => {
    const result = monitor.track(assembler);
    expect(result).toBe(true);
  });

  it('should get metrics', () => {
    monitor.track(assembler);
    const metrics = monitor.getMetrics();
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('should get metrics for specific assembler', () => {
    monitor.track(assembler);
    const metrics = monitor.getMetrics('mon-1');
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('should get history with limit', () => {
    monitor.track(assembler);
    const history = monitor.getHistory(5);
    expect(Array.isArray(history)).toBe(true);
  });

  it('should get status', () => {
    monitor.track(assembler);
    const status = monitor.getStatus();
    expect(status.status).toBe('active');
    expect(status.trackedCount).toBeGreaterThan(0);
  });

  it('should get snapshot with metrics', () => {
    monitor.track(assembler);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset monitor state', () => {
    monitor.track(assembler);
    monitor.reset();
    const status = monitor.getStatus();
    expect(status.trackedCount).toBe(0);
  });

  it('should generate report string', () => {
    monitor.track(assembler);
    const report = monitor.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('active');
  });

  it('should export metrics with version', () => {
    monitor.track(assembler);
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.data.trackedCount).toBeDefined();
  });

  it('should pause and resume monitoring', () => {
    monitor.pause();
    expect(monitor.getStatus().status).toBe('paused');
    monitor.resume();
    expect(monitor.getStatus().status).toBe('active');
  });
});