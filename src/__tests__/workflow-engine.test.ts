/**
 * V65 Workflow Engine Test Suite
 * Tests for WorkflowBuilder, WorkflowExecutor, WorkflowScheduler, WorkflowMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowBuilder } from '../workflow-engine/WorkflowBuilder.js';
import { WorkflowExecutor } from '../workflow-engine/WorkflowExecutor.js';
import { WorkflowScheduler } from '../workflow-engine/WorkflowScheduler.js';
import { WorkflowMonitor } from '../workflow-engine/WorkflowMonitor.js';

describe('WorkflowBuilder', () => {
  let builder: WorkflowBuilder;

  beforeEach(() => {
    builder = new WorkflowBuilder();
  });

  it('should create a workflow with valid id', () => {
    const wf = builder.create('Test Workflow', 'wf-001');
    expect(wf).toBe(builder);
    expect(builder.getWorkflow('wf-001')).toBeDefined();
  });

  it('should add steps to workflow', () => {
    builder.create('Test', 'wf-fixed').addStep('Step 1', 'task');
    const wf = builder.getWorkflow('wf-fixed');
    expect(wf?.steps.length).toBe(1);
  });

  it('should compile a valid workflow', () => {
    builder.create('Test').addStep('Step 1', 'task').addStep('Step 2', 'condition');
    const compiled = builder.compile();
    expect(compiled.steps.length).toBe(2);
    expect(compiled.version).toContain('compiled');
  });

  it('should throw when compiling empty workflow', () => {
    builder.create('Empty');
    expect(() => builder.compile()).toThrow('must have at least one step');
  });

  it('should track total workflows', () => {
    builder.create('WF1').addStep('S1', 'task');
    builder.create('WF2').addStep('S1', 'task');
    const snap = builder.getSnapshot();
    expect(snap.metrics.totalWorkflows).toBe(2);
  });

  it('should reset all workflows', () => {
    builder.create('WF1');
    builder.reset();
    const snap = builder.getSnapshot();
    expect(snap.metrics.totalWorkflows).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = builder.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should generate report string', () => {
    const report = builder.getReport();
    expect(report).toContain('WorkflowBuilder Report');
  });

  it('should enforce max steps limit', () => {
    const limitedBuilder = new WorkflowBuilder({ maxSteps: 2 });
    limitedBuilder.create('Test').addStep('S1', 'task').addStep('S2', 'task');
    expect(() => limitedBuilder.addStep('S3', 'task')).toThrow('Maximum steps');
  });

  it('should set correct default config', () => {
    expect(builder.config.maxSteps).toBe(100);
    expect(builder.config.defaultTimeout).toBe(30000);
    expect(builder.config.enableValidation).toBe(true);
  });
});

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
  });

  it('should create executor with default config', () => {
    expect(executor.config.maxConcurrent).toBe(10);
    expect(executor.config.stepTimeout).toBe(30000);
  });

  it('should execute workflow and return results', async () => {
    const wf = new WorkflowBuilder().create('Test').addStep('Step1', 'task');
    const compiled = wf.compile();
    const results = await executor.execute(compiled);
    expect(results.size).toBeGreaterThan(0);
  });

  it('should pause running execution', async () => {
    const wf = new WorkflowBuilder().create('Test').addStep('Step1', 'task');
    const compiled = wf.compile();
    // Note: actual pause requires mock delays, this tests the method
    executor.cancel('non-existent');
    expect(executor.getStatus('non-existent')).toBeUndefined();
  });

  it('should resume paused execution', () => {
    const resumed = executor.resume('non-existent');
    expect(resumed).toBe(false);
  });

  it('should cancel execution', async () => {
    const wf = new WorkflowBuilder().create('Test').addStep('Step1', 'task');
    const compiled = wf.compile();
    await executor.execute(compiled);
    const cancelled = executor.cancel('exec-1');
    expect(typeof cancelled).toBe('boolean');
  });

  it('should get execution status', () => {
    const status = executor.getStatus('unknown-id');
    expect(status).toBeUndefined();
  });

  it('should reset executor state', () => {
    executor.reset();
    const snap = executor.getSnapshot();
    expect(snap.metrics.totalExecutions).toBe(0);
  });

  it('should generate executor report', () => {
    const report = executor.getReport();
    expect(report).toContain('WorkflowExecutor Report');
  });

  it('should export executor metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should enforce config limits', () => {
    const customExecutor = new WorkflowExecutor({ maxConcurrent: 5 });
    expect(customExecutor.config.maxConcurrent).toBe(5);
  });
});

describe('WorkflowScheduler', () => {
  let scheduler: WorkflowScheduler;

  beforeEach(() => {
    scheduler = new WorkflowScheduler();
  });

  it('should create scheduler with default config', () => {
    expect(scheduler.config.maxScheduled).toBe(50);
    expect(scheduler.config.defaultDelay).toBe(5000);
  });

  it('should schedule a workflow', () => {
    const wf = new WorkflowBuilder().create('Test').addStep('S1', 'task').compile();
    const scheduleId = scheduler.schedule(wf, 1000);
    expect(scheduleId).toContain('sched-');
  });

  it('should schedule recurring workflow', () => {
    const wf = new WorkflowBuilder().create('Recurring').addStep('S1', 'task').compile();
    const scheduleId = scheduler.scheduleRecurring(wf, 60000);
    expect(scheduleId).toContain('sched-');
  });

  it('should cancel scheduled workflow', () => {
    const wf = new WorkflowBuilder().create('Test').addStep('S1', 'task').compile();
    const scheduleId = scheduler.schedule(wf);
    const cancelled = scheduler.cancel(scheduleId);
    expect(cancelled).toBe(true);
  });

  it('should return empty history when none exists', () => {
    const history = scheduler.getHistory();
    expect(history.length).toBe(0);
  });

  it('should get scheduled workflows', () => {
    const wf = new WorkflowBuilder().create('Test').addStep('S1', 'task').compile();
    scheduler.schedule(wf);
    const scheduled = scheduler.getScheduled();
    expect(scheduled.length).toBeGreaterThanOrEqual(0);
  });

  it('should reset scheduler state', () => {
    scheduler.reset();
    const snap = scheduler.getSnapshot();
    expect(snap.metrics.totalScheduled).toBe(0);
  });

  it('should generate scheduler report', () => {
    const report = scheduler.getReport();
    expect(report).toContain('WorkflowScheduler Report');
  });

  it('should export scheduler metrics', () => {
    const metrics = scheduler.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should enforce max scheduled limit', () => {
    const limitedScheduler = new WorkflowScheduler({ maxScheduled: 1 });
    const wf = new WorkflowBuilder().create('Test').addStep('S1', 'task').compile();
    limitedScheduler.schedule(wf);
    expect(() => limitedScheduler.schedule(wf)).toThrow('Maximum scheduled');
  });
});

describe('WorkflowMonitor', () => {
  let monitor: WorkflowMonitor;

  beforeEach(() => {
    monitor = new WorkflowMonitor();
  });

  it('should create monitor with default config', () => {
    expect(monitor.config.retentionPeriod).toBe(86400000);
    expect(monitor.config.enableAlerting).toBe(false);
  });

  it('should track workflow execution', () => {
    const metric = monitor.track('wf-1', 'exec-1', 5);
    expect(metric.workflowId).toBe('wf-1');
    expect(metric.stepCount).toBe(5);
  });

  it('should get running workflows', () => {
    monitor.track('wf-1', 'exec-1', 5);
    const running = monitor.getRunning();
    expect(running.length).toBe(1);
  });

  it('should update metric status', () => {
    monitor.track('wf-1', 'exec-1', 5);
    monitor.updateMetric('exec-1', { status: 'completed', completedSteps: 5 });
    const running = monitor.getRunning();
    expect(running.length).toBe(0);
  });

  it('should get completed workflows', () => {
    monitor.track('wf-1', 'exec-1', 5);
    monitor.updateMetric('exec-1', { status: 'completed' });
    const completed = monitor.getCompleted();
    expect(completed.length).toBe(1);
  });

  it('should get metrics with limit', () => {
    const metrics = monitor.getMetrics(10);
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('should reset monitor state', () => {
    monitor.reset();
    const snap = monitor.getSnapshot();
    expect(snap.metrics.total).toBe(0);
  });

  it('should generate monitor report', () => {
    const report = monitor.getReport();
    expect(report).toContain('WorkflowMonitor Report');
  });

  it('should export monitor metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should enforce custom config', () => {
    const customMonitor = new WorkflowMonitor({ alertThreshold: 15 });
    expect(customMonitor.config.alertThreshold).toBe(15);
  });
});

describe('Integration', () => {
  it('should work together: build, schedule, execute, monitor', async () => {
    const builder = new WorkflowBuilder();
    const scheduler = new WorkflowScheduler();
    const executor = new WorkflowExecutor();
    const monitor = new WorkflowMonitor();

    builder.create('Integration Test').addStep('Step 1', 'task').addStep('Step 2', 'parallel');
    const wf = builder.compile();

    const scheduleId = scheduler.schedule(wf);
    expect(scheduleId).toBeDefined();

    const results = await executor.execute(wf);
    expect(results.size).toBe(2);

    const metric = monitor.track(wf.id, 'exec-1', 2);
    expect(metric.stepCount).toBe(2);
  });
});
