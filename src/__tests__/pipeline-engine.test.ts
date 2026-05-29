/**
 * pipeline-engine.test.ts - V92 Pipeline Engine Tests
 * Tests for PipelineEngine, PipelineRunner, PipelineMonitor, and PipelineRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipelineEngine } from '../pipeline-engine/PipelineEngine';
import { PipelineRunner } from '../pipeline-engine/PipelineRunner';
import { PipelineMonitor } from '../pipeline-engine/PipelineMonitor';
import { PipelineRegistry } from '../pipeline-engine/PipelineRegistry';

// ============ PipelineEngine Tests ============
describe('PipelineEngine', () => {
  let engine: PipelineEngine;

  beforeEach(() => {
    engine = new PipelineEngine({
      maxConcurrent: 5,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
    });
  });

  it('should create a pipeline with config', () => {
    const pipeline = engine.create('pipe-1', 'Test Pipeline');
    expect(pipeline.id).toBe('pipe-1');
    expect(pipeline.name).toBe('Test Pipeline');
    expect(pipeline.status).toBe('idle');
    expect(pipeline.stages).toHaveLength(0);
  });

  it('should add stages to pipeline', () => {
    engine.create('pipe-1', 'Test');
    const stage = { id: 's1', name: 'Stage 1', handler: async () => {} };
    const result = engine.add('pipe-1', stage);
    expect(result).toBe(true);
    const pipeline = engine.getPipeline('pipe-1');
    expect(pipeline?.stages).toHaveLength(1);
  });

  it('should execute pipeline with stages', async () => {
    engine.create('pipe-1', 'Test');
    engine.add('pipe-1', { id: 's1', name: 'Stage 1', handler: async () => {} });
    const result = await engine.execute('pipe-1', { data: 42 });
    expect(result).toHaveProperty('data', 42);
  });

  it('should get pipeline by id', () => {
    engine.create('pipe-1', 'Test');
    const pipeline = engine.getPipeline('pipe-1');
    expect(pipeline).toBeDefined();
    expect(pipeline?.id).toBe('pipe-1');
  });

  it('should return undefined for non-existent pipeline', () => {
    const pipeline = engine.getPipeline('non-existent');
    expect(pipeline).toBeUndefined();
  });

  it('should get pipeline stats', () => {
    const stats = engine.getStats();
    expect(stats).toHaveProperty('totalExecutions');
    expect(stats).toHaveProperty('successRate');
  });

  it('should get snapshot', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot.metrics).toHaveProperty('totalPipelines');
  });

  it('should reset engine state', () => {
    engine.create('pipe-1', 'Test');
    engine.reset();
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics.totalPipelines).toBe(0);
  });

  it('should generate report', () => {
    const report = engine.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Pipeline Engine Report');
  });

  it('should export metrics with version', () => {
    const metrics = engine.exportMetrics();
    expect(metrics).toHaveProperty('version', 'V92');
    expect(metrics).toHaveProperty('totalPipelines');
  });
});

// ============ PipelineRunner Tests ============
describe('PipelineRunner', () => {
  let runner: PipelineRunner;

  beforeEach(() => {
    runner = new PipelineRunner({
      maxExecutionTime: 60000,
      enableCheckpoints: true,
      gracefulShutdownTimeout: 5000,
    });
  });

  it('should create runner with config', () => {
    expect(runner.config).toHaveProperty('maxExecutionTime', 60000);
    expect(runner.config).toHaveProperty('enableCheckpoints', true);
  });

  it('should run stages successfully', async () => {
    let executed = false;
    const stages = [async () => { executed = true; }];
    await runner.run('pipe-1', stages);
    expect(executed).toBe(true);
    expect(runner.getStatus()).toBe('completed');
  });

  it('should stop running pipeline', async () => {
    let stage2Ran = false;
    const stages = [
      async () => {
        await new Promise((r) => setTimeout(r, 50));
      },
      async () => {
        stage2Ran = true;
      },
    ];
    runner.run('pipe-1', stages);
    await new Promise((r) => setTimeout(r, 10));
    runner.stop();
    expect(runner.getStatus()).toBe('stopped');
    // Stage 2 should not run because we stopped between stages
    await new Promise((r) => setTimeout(r, 200));
    expect(stage2Ran).toBe(false);
  });

  it('should pause and resume runner', async () => {
    let counter = 0;
    const stages = [
      async () => { counter++; },
      async () => { counter++; },
      async () => { counter++; },
    ];
    const runPromise = runner.run('pipe-1', stages);
    runner.pause();
    expect(runner.getStatus()).toBe('paused');
    runner.resume();
    await runPromise;
    expect(counter).toBe(3);
  });

  it('should return false when pausing non-running runner', () => {
    const result = runner.pause();
    expect(result).toBe(false);
  });

  it('should return false when resuming non-paused runner', () => {
    runner.resume();
    const result = runner.resume();
    expect(result).toBe(false);
  });

  it('should get runner stats', () => {
    const stats = runner.getStats();
    expect(stats).toHaveProperty('stagesCompleted');
    expect(stats).toHaveProperty('stagesFailed');
  });

  it('should get runner snapshot', () => {
    const snapshot = runner.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('status');
  });

  it('should reset runner state', () => {
    runner.reset();
    const snapshot = runner.getSnapshot();
    expect(snapshot.metrics.status).toBe('idle');
    expect(snapshot.metrics.stagesCompleted).toBe(0);
  });

  it('should generate report', () => {
    const report = runner.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Pipeline Runner Report');
  });

  it('should export metrics with version', () => {
    const metrics = runner.exportMetrics();
    expect(metrics).toHaveProperty('version', 'V92');
  });
});

// ============ PipelineMonitor Tests ============
describe('PipelineMonitor', () => {
  let monitor: PipelineMonitor;

  beforeEach(() => {
    monitor = new PipelineMonitor({
      historySize: 50,
      samplingInterval: 1000,
      enableAlerts: true,
    });
  });

  it('should create monitor with config', () => {
    expect(monitor.config).toHaveProperty('historySize', 50);
    expect(monitor.config).toHaveProperty('enableAlerts', true);
  });

  it('should track pipeline', () => {
    monitor.track('pipe-1');
    const metrics = monitor.getMetrics();
    expect(metrics.trackedPipelines).toBe(1);
  });

  it('should untrack pipeline', () => {
    monitor.track('pipe-1');
    monitor.untrack('pipe-1');
    const metrics = monitor.getMetrics();
    expect(metrics.trackedPipelines).toBe(0);
  });

  it('should record execution entry', () => {
    monitor.recordExecution({
      pipelineId: 'pipe-1',
      timestamp: Date.now(),
      duration: 100,
      status: 'success',
      metrics: { cpu: 0.5 },
    });
    const history = monitor.getHistory();
    expect(history).toHaveLength(1);
  });

  it('should filter history by pipeline id', () => {
    monitor.recordExecution({ pipelineId: 'pipe-1', timestamp: Date.now(), duration: 100, status: 'success', metrics: {} });
    monitor.recordExecution({ pipelineId: 'pipe-2', timestamp: Date.now(), duration: 200, status: 'failure', metrics: {} });
    const history = monitor.getHistory('pipe-1');
    expect(history).toHaveLength(1);
    expect(history[0].pipelineId).toBe('pipe-1');
  });

  it('should limit history with parameter', () => {
    for (let i = 0; i < 10; i++) {
      monitor.recordExecution({ pipelineId: `pipe-${i}`, timestamp: Date.now(), duration: 100, status: 'success', metrics: {} });
    }
    const history = monitor.getHistory(undefined, 5);
    expect(history).toHaveLength(5);
  });

  it('should get metrics', () => {
    monitor.recordExecution({ pipelineId: 'pipe-1', timestamp: Date.now(), duration: 100, status: 'success', metrics: {} });
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveProperty('trackedPipelines');
    expect(metrics).toHaveProperty('totalEntries');
    expect(metrics).toHaveProperty('averageDuration');
  });

  it('should get status', () => {
    expect(monitor.getStatus()).toBe('active');
    monitor.setStatus('suspended');
    expect(monitor.getStatus()).toBe('suspended');
  });

  it('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('currentStatus');
  });

  it('should reset monitor state', () => {
    monitor.track('pipe-1');
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.trackedPipelines).toBe(0);
    expect(metrics.totalEntries).toBe(0);
  });

  it('should generate report', () => {
    const report = monitor.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Pipeline Monitor Report');
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics).toHaveProperty('version', 'V92');
  });
});

// ============ PipelineRegistry Tests ============
describe('PipelineRegistry', () => {
  let registry: PipelineRegistry;

  beforeEach(() => {
    registry = new PipelineRegistry({
      maxPipelines: 100,
      enableValidation: true,
      autoCleanup: false,
      cleanupInterval: 30000,
    });
  });

  it('should create registry with config', () => {
    expect(registry.config).toHaveProperty('maxPipelines', 100);
    expect(registry.config).toHaveProperty('enableValidation', true);
  });

  it('should register pipeline', () => {
    const result = registry.register({
      id: 'pipe-1',
      name: 'Test Pipeline',
      description: 'A test pipeline',
      version: '1.0.0',
      metadata: {},
    });
    expect(result).toBe(true);
  });

  it('should not register duplicate pipeline', () => {
    registry.register({ id: 'pipe-1', name: 'Test', description: '', version: '1.0.0', metadata: {} });
    const result = registry.register({ id: 'pipe-1', name: 'Test 2', description: '', version: '2.0.0', metadata: {} });
    expect(result).toBe(false);
  });

  it('should unregister pipeline', () => {
    registry.register({ id: 'pipe-1', name: 'Test', description: '', version: '1.0.0', metadata: {} });
    const result = registry.unregister('pipe-1');
    expect(result).toBe(true);
    expect(registry.get('pipe-1')).toBeUndefined();
  });

  it('should get pipeline by id', () => {
    registry.register({ id: 'pipe-1', name: 'Test', description: '', version: '1.0.0', metadata: {} });
    const pipeline = registry.get('pipe-1');
    expect(pipeline).toBeDefined();
    expect(pipeline?.id).toBe('pipe-1');
  });

  it('should get all registered pipelines', () => {
    registry.register({ id: 'pipe-1', name: 'Test 1', description: '', version: '1.0.0', metadata: {} });
    registry.register({ id: 'pipe-2', name: 'Test 2', description: '', version: '1.0.0', metadata: {} });
    const pipelines = registry.getAll();
    expect(pipelines).toHaveLength(2);
  });

  it('should get pipeline by name', () => {
    registry.register({ id: 'pipe-1', name: 'MyPipeline', description: '', version: '1.0.0', metadata: {} });
    const pipeline = registry.getByName('MyPipeline');
    expect(pipeline).toBeDefined();
    expect(pipeline?.name).toBe('MyPipeline');
  });

  it('should update pipeline metadata', () => {
    registry.register({ id: 'pipe-1', name: 'Test', description: '', version: '1.0.0', metadata: {} });
    const result = registry.updateMetadata('pipe-1', { key: 'value' });
    expect(result).toBe(true);
    const pipeline = registry.get('pipe-1');
    expect(pipeline?.metadata).toHaveProperty('key', 'value');
  });

  it('should mark pipeline active/inactive', () => {
    registry.register({ id: 'pipe-1', name: 'Test', description: '', version: '1.0.0', metadata: {} });
    registry.markActive('pipe-1');
    expect(registry.getActiveCount()).toBe(1);
    registry.markInactive('pipe-1');
    expect(registry.getActiveCount()).toBe(0);
  });

  it('should get registry snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalRegistered');
  });

  it('should reset registry state', () => {
    registry.register({ id: 'pipe-1', name: 'Test', description: '', version: '1.0.0', metadata: {} });
    registry.reset();
    const pipelines = registry.getAll();
    expect(pipelines).toHaveLength(0);
  });

  it('should generate report', () => {
    const report = registry.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Pipeline Registry Report');
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics).toHaveProperty('version', 'V92');
    expect(metrics).toHaveProperty('totalRegistered');
  });
});