/**
 * V66 Data Pipeline - Tests
 * 27+ tests for PipelineBuilder, PipelineRunner, PipelineCache, PipelineMonitor
 */

import PipelineBuilder from '../data-pipeline/PipelineBuilder';
import PipelineRunner from '../data-pipeline/PipelineRunner';
import PipelineCache from '../data-pipeline/PipelineCache';
import PipelineMonitor from '../data-pipeline/PipelineMonitor';

describe('PipelineBuilder', () => {
  test('create initializes empty pipeline', () => {
    const builder = new PipelineBuilder();
    const pipeline = builder.create('Test Pipeline').getPipeline();
    expect(pipeline.name).toBe('Test Pipeline');
    expect(pipeline.stages).toHaveLength(0);
  });

  test('addStage adds handler to pipeline', () => {
    const builder = new PipelineBuilder();
    const handler = (input: number) => input * 2;
    builder.create('Add Stage Test').addStage({ id: 's1', name: 'Double', handler });
    const pipeline = builder.getPipeline();
    expect(pipeline.stages).toHaveLength(1);
    expect(pipeline.stages[0].id).toBe('s1');
  });

  test('compile returns pipeline with all stages', () => {
    const builder = new PipelineBuilder();
    builder.create('Compile Test')
      .addStage({ id: 's1', name: 'Stage 1', handler: (x: unknown) => x })
      .addStage({ id: 's2', name: 'Stage 2', handler: (x: unknown) => x });
    const pipeline = builder.compile();
    expect(pipeline.stages).toHaveLength(2);
  });

  test('getPipeline returns compiled pipeline', () => {
    const builder = new PipelineBuilder();
    builder.create('Get Pipeline Test').addStage({ id: 's1', name: 'Test', handler: (x: unknown) => x });
    expect(builder.getPipeline()).toEqual(builder.compile());
  });

  test('getSnapshot returns metrics', () => {
    const builder = new PipelineBuilder();
    builder.create('Snapshot Test').addStage({ id: 's1', name: 'Test', handler: (x: unknown) => x });
    const snapshot = builder.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('stageCount');
    expect(snapshot.metrics.stageCount).toBe(1);
  });

  test('reset clears all stages', () => {
    const builder = new PipelineBuilder();
    builder.create('Reset Test').addStage({ id: 's1', name: 'Test', handler: (x: unknown) => x });
    builder.reset();
    const pipeline = builder.getPipeline();
    expect(pipeline.stages).toHaveLength(0);
  });

  test('getReport returns string report', () => {
    const builder = new PipelineBuilder();
    builder.create('Report Test').addStage({ id: 's1', name: 'Test', handler: (x: unknown) => x });
    const report = builder.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Report');
  });

  test('exportMetrics returns version and count', () => {
    const builder = new PipelineBuilder();
    builder.create('Export Test').addStage({ id: 's1', name: 'Test', handler: (x: unknown) => x });
    const metrics = builder.exportMetrics();
    expect(metrics.version).toBe('v66');
    expect(metrics).toHaveProperty('stageCount');
  });

  test('compile throws on empty pipeline', () => {
    const builder = new PipelineBuilder();
    expect(() => builder.compile()).toThrow('Cannot compile empty pipeline');
  });

  test('config property is accessible', () => {
    const builder = new PipelineBuilder({ timeout: 5000 });
    expect(builder.config.timeout).toBe(5000);
  });
});

describe('PipelineRunner', () => {
  test('run executes pipeline stages', async () => {
    const runner = new PipelineRunner();
    const pipeline = new PipelineBuilder().create('Run Test')
      .addStage({ id: 's1', name: 'Add One', handler: (x: number) => x + 1 })
      .compile();
    const result = await runner.run(pipeline, 5);
    expect(result.results[0]).toBe(6);
  });

  test('stop aborts execution', async () => {
    const runner = new PipelineRunner();
    const pipeline = new PipelineBuilder().create('Stop Test')
      .addStage({ id: 's1', name: 'Slow', handler: async (x: number) => { await new Promise(r => setTimeout(r, 100)); return x; } })
      .compile();
    const runPromise = runner.run(pipeline, 1);
    runner.stop();
    const result = await runPromise;
    expect(result.status).toBe('stopped');
  });

  test('pause and resume works', async () => {
    const runner = new PipelineRunner();
    const pipeline = new PipelineBuilder().create('Pause Test')
      .addStage({ id: 's1', name: 'Test', handler: (x: number) => x + 1 })
      .compile();
    runner.run(pipeline, 1);
    runner.pause();
    expect(runner.getStatus()).toBe('paused');
    runner.resume();
    expect(runner.getStatus()).toBe('running');
  });

  test('getStatus returns current status', () => {
    const runner = new PipelineRunner();
    expect(runner.getStatus()).toBe('idle');
  });

  test('getSnapshot returns metrics', () => {
    const runner = new PipelineRunner();
    const snapshot = runner.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('status');
  });

  test('reset clears runner state', async () => {
    const runner = new PipelineRunner();
    const pipeline = new PipelineBuilder().create('Reset Test')
      .addStage({ id: 's1', name: 'Test', handler: (x: number) => x + 1 })
      .compile();
    await runner.run(pipeline, 1);
    runner.reset();
    expect(runner.getStatus()).toBe('idle');
  });

  test('getReport returns string report', () => {
    const runner = new PipelineRunner();
    const report = runner.getReport();
    expect(typeof report).toBe('string');
  });

  test('exportMetrics returns version and status', () => {
    const runner = new PipelineRunner();
    const metrics = runner.exportMetrics();
    expect(metrics.version).toBe('v66');
    expect(metrics).toHaveProperty('status');
  });
});

describe('PipelineCache', () => {
  test('set stores value with key', () => {
    const cache = new PipelineCache();
    cache.set('key1', { data: 'value' });
    expect(cache.get('key1')).toEqual({ data: 'value' });
  });

  test('get retrieves stored value', () => {
    const cache = new PipelineCache();
    cache.set('key2', 'test-value');
    expect(cache.get('key2')).toBe('test-value');
  });

  test('delete removes entry', () => {
    const cache = new PipelineCache();
    cache.set('key3', 'value');
    expect(cache.delete('key3')).toBe(true);
    expect(cache.get('key3')).toBeNull();
  });

  test('clear removes all entries', () => {
    const cache = new PipelineCache();
    cache.set('key4', 'v1');
    cache.set('key5', 'v2');
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  test('getCached alias works', () => {
    const cache = new PipelineCache();
    cache.set('key6', 'value');
    expect(cache.getCached('key6')).toBe('value');
  });

  test('has checks for key existence', () => {
    const cache = new PipelineCache();
    cache.set('key7', 'value');
    expect(cache.has('key7')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  test('keys returns all keys', () => {
    const cache = new PipelineCache();
    cache.set('a', 1);
    cache.set('b', 2);
    const keys = cache.keys();
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  test('size returns correct count', () => {
    const cache = new PipelineCache();
    cache.set('k1', 1);
    cache.set('k2', 2);
    expect(cache.size()).toBe(2);
  });

  test('getSnapshot returns metrics', () => {
    const cache = new PipelineCache();
    cache.set('key', 'value');
    cache.get('key');
    const snapshot = cache.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('size');
    expect(snapshot.metrics).toHaveProperty('hits');
  });

  test('reset clears hits and misses', () => {
    const cache = new PipelineCache();
    cache.set('key', 'value');
    cache.get('key');
    cache.reset();
    const snapshot = cache.getSnapshot();
    expect(snapshot.metrics.hits).toBe(0);
    expect(snapshot.metrics.misses).toBe(0);
  });

  test('getReport returns string report', () => {
    const cache = new PipelineCache();
    const report = cache.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Cache');
  });

  test('exportMetrics returns version and stats', () => {
    const cache = new PipelineCache();
    const metrics = cache.exportMetrics();
    expect(metrics.version).toBe('v66');
    expect(metrics).toHaveProperty('size');
  });
});

describe('PipelineMonitor', () => {
  test('track creates execution tracking', () => {
    const monitor = new PipelineMonitor();
    const execId = monitor.track('p1', 'Test Pipeline', 3);
    expect(typeof execId).toBe('string');
    expect(execId).toContain('exec-');
  });

  test('getMetrics returns metrics for execution', () => {
    const monitor = new PipelineMonitor();
    const execId = monitor.track('p1', 'Metrics Test', 2);
    const metrics = monitor.getMetrics(execId);
    expect(metrics).not.toBeNull();
    expect(metrics?.pipelineId).toBe('p1');
  });

  test('getRunning returns active executions', () => {
    const monitor = new PipelineMonitor();
    monitor.track('p1', 'Running Test', 2);
    const running = monitor.getRunning();
    expect(running).toHaveLength(1);
  });

  test('getHistory returns completed executions', () => {
    const monitor = new PipelineMonitor();
    const execId = monitor.track('p1', 'History Test', 2);
    monitor.completeExecution(execId, 'completed');
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  test('completeExecution marks as completed', () => {
    const monitor = new PipelineMonitor();
    const execId = monitor.track('p1', 'Complete Test', 2);
    monitor.completeExecution(execId, 'completed');
    const metrics = monitor.getMetrics(execId);
    expect(metrics?.status).toBe('completed');
  });

  test('completeExecution with failed status', () => {
    const monitor = new PipelineMonitor();
    const execId = monitor.track('p1', 'Failed Test', 2);
    monitor.completeExecution(execId, 'failed');
    const metrics = monitor.getMetrics(execId);
    expect(metrics?.status).toBe('failed');
  });

  test('getSnapshot returns monitoring metrics', () => {
    const monitor = new PipelineMonitor();
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('running');
    expect(snapshot.metrics).toHaveProperty('total');
  });

  test('reset clears all tracking data', () => {
    const monitor = new PipelineMonitor();
    monitor.track('p1', 'Reset Test', 2);
    monitor.reset();
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.running).toBe(0);
  });

  test('getReport returns string report', () => {
    const monitor = new PipelineMonitor();
    const report = monitor.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Monitor');
  });

  test('exportMetrics returns version and stats', () => {
    const monitor = new PipelineMonitor();
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('v66');
    expect(metrics).toHaveProperty('total');
  });

  test('addStageEvent updates stage progress', () => {
    const monitor = new PipelineMonitor();
    const execId = monitor.track('p1', 'Stage Event Test', 3);
    monitor.addStageEvent(execId, 's1', 'complete');
    const running = monitor.getRunning();
    expect(running[0].events.length).toBeGreaterThan(1);
  });
});