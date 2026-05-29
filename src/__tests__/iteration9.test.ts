/**
 * V39 Iteration 9 Tests
 * Tests for Orchestrator, Scheduler, Executor, and Reporter modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../iteration9/Orchestrator';
import { Scheduler } from '../iteration9/Scheduler';
import { Executor } from '../iteration9/Executor';
import { Reporter } from '../iteration9/Reporter';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator({ maxConcurrency: 3, retryAttempts: 2 });
  });

  it('should create orchestrator with default config', () => {
    const o = new Orchestrator();
    expect(o).toBeDefined();
    const status = o.getStatus();
    expect(status.status).toBe('idle');
  });

  it('should create orchestrator with custom config', () => {
    const o = new Orchestrator({ maxConcurrency: 10, timeout: 5000 });
    expect(o).toBeDefined();
  });

  it('should orchestrate a task successfully', async () => {
    const mockTask = vi.fn().mockResolvedValue('result');
    const result = await orchestrator.orchestrate('task1', 'Test Task', mockTask);
    expect(result).toBe('result');
    expect(mockTask).toHaveBeenCalledTimes(1);
  });

  it('should handle task failure with retry', async () => {
    const mockTask = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('success');
    const o = new Orchestrator({ retryAttempts: 3 });
    const result = await o.orchestrate('task1', 'Test', mockTask);
    expect(result).toBe('success');
  });

  it('should record failed tasks after retries exhausted', async () => {
    const mockTask = vi.fn().mockRejectedValue(new Error('permanent failure'));
    const o = new Orchestrator({ retryAttempts: 1 });
    await expect(o.orchestrate('task1', 'Test', mockTask)).rejects.toThrow('permanent failure');
    const status = o.getStatus();
    expect(status.failedTasks).toBe(1);
  });

  it('should coordinate multiple tasks', async () => {
    const tasks = [
      { id: '1', name: 'Task 1', fn: async () => 'result1' },
      { id: '2', name: 'Task 2', fn: async () => 'result2' },
    ];
    const results = await orchestrator.coordinate(tasks);
    expect(results).toHaveLength(2);
  });

  it('should get status correctly', () => {
    const status = orchestrator.getStatus();
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('activeTasks');
    expect(status).toHaveProperty('completedTasks');
  });

  it('should get snapshot with metrics', () => {
    const snapshot = orchestrator.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalTasks');
    expect(snapshot.metrics).toHaveProperty('successRate');
  });

  it('should reset orchestrator state', () => {
    orchestrator.reset();
    const status = orchestrator.getStatus();
    expect(status.status).toBe('idle');
    expect(status.completedTasks).toBe(0);
    expect(status.failedTasks).toBe(0);
  });

  it('should generate report', () => {
    const report = orchestrator.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Orchestrator Report');
  });

  it('should export metrics', () => {
    const metrics = orchestrator.exportMetrics();
    expect(metrics).toHaveProperty('totalTasks');
    expect(metrics).toHaveProperty('uptime');
    expect(typeof metrics.successRate).toBe('number');
  });
});

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = new Scheduler({ maxScheduledTasks: 10 });
  });

  it('should create scheduler with default config', () => {
    const s = new Scheduler();
    expect(s).toBeDefined();
    expect(s.getScheduled()).toHaveLength(0);
  });

  it('should schedule a task', () => {
    const task = scheduler.schedule({
      name: 'Test Task',
      taskFn: async () => 'done',
    });
    expect(task).toBeDefined();
    expect(task?.name).toBe('Test Task');
    expect(scheduler.getScheduled()).toHaveLength(1);
  });

  it('should reject task when max reached', () => {
    const s = new Scheduler({ maxScheduledTasks: 1 });
    s.schedule({ name: 'Task 1', taskFn: async () => 'done' });
    const result = s.schedule({ name: 'Task 2', taskFn: async () => 'done' });
    expect(result).toBeNull();
  });

  it('should cancel a scheduled task', () => {
    const task = scheduler.schedule({ name: 'Test', taskFn: async () => 'done' });
    expect(task).toBeDefined();
    const cancelled = scheduler.cancel(task!.id);
    expect(cancelled).toBe(true);
    expect(scheduler.getScheduled()).toHaveLength(0);
  });

  it('should return false when cancelling non-existent task', () => {
    const result = scheduler.cancel('non-existent-id');
    expect(result).toBe(false);
  });

  it('should get all scheduled tasks', () => {
    scheduler.schedule({ name: 'Task 1', taskFn: async () => 'done' });
    scheduler.schedule({ name: 'Task 2', taskFn: async () => 'done' });
    const tasks = scheduler.getScheduled();
    expect(tasks).toHaveLength(2);
  });

  it('should get snapshot with metrics', () => {
    scheduler.schedule({ name: 'Test', taskFn: async () => 'done' });
    const snapshot = scheduler.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.totalScheduled).toBe(1);
  });

  it('should reset scheduler', () => {
    scheduler.schedule({ name: 'Test', taskFn: async () => 'done' });
    scheduler.reset();
    expect(scheduler.getScheduled()).toHaveLength(0);
  });

  it('should generate report', () => {
    const report = scheduler.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Scheduler Report');
  });

  it('should export metrics', () => {
    const metrics = scheduler.exportMetrics();
    expect(metrics).toHaveProperty('uptime');
    expect(metrics).toHaveProperty('executedCount');
  });
});

describe('Executor', () => {
  let executor: Executor;

  beforeEach(() => {
    executor = new Executor({ maxConcurrent: 5 });
  });

  it('should create executor with default config', () => {
    const e = new Executor();
    expect(e).toBeDefined();
    expect(e.getResults()).toHaveLength(0);
  });

  it('should execute a task successfully', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    const result = await executor.execute('task1', 'Test', mockFn);
    expect(result).toBe('result');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle task failure', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('task failed'));
    await expect(executor.execute('task1', 'Test', mockFn)).rejects.toThrow('task failed');
  });

  it('should abort a running task', async () => {
    const mockFn = vi.fn().mockImplementation(() => new Promise(() => {}));
    executor.execute('task1', 'Test', mockFn, { timeout: 60000 });
    
    // Wait a tick for the task to start
    await new Promise(r => setTimeout(r, 10));
    
    expect(executor.isRunning('task1')).toBe(true);
    
    const aborted = executor.abort('task1');
    expect(aborted).toBe(true);
    expect(executor.isRunning('task1')).toBe(false);
    expect(executor.getRunningCount()).toBe(0);
  });

  it('should return false when aborting non-existent task', () => {
    const result = executor.abort('non-existent');
    expect(result).toBe(false);
  });

  it('should get results from completed tasks', async () => {
    await executor.execute('task1', 'Test', async () => 'result1');
    await executor.execute('task2', 'Test', async () => 'result2');
    const results = executor.getResults();
    expect(results).toHaveLength(2);
  });

  it('should get specific task result', async () => {
    await executor.execute('task1', 'Test', async () => 'result1');
    const result = executor.getTaskResult('task1');
    expect(result).toBeDefined();
    expect(result?.result).toBe('result1');
  });

  it('should get snapshot with metrics', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('completed');
  });

  it('should reset executor', async () => {
    await executor.execute('task1', 'Test', async () => 'result');
    executor.reset();
    expect(executor.getResults()).toHaveLength(0);
    expect(executor.getRunningCount()).toBe(0);
  });

  it('should generate report', () => {
    const report = executor.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Executor Report');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics).toHaveProperty('successRate');
    expect(metrics).toHaveProperty('averageDuration');
  });

  it('should check if task is running', async () => {
    let block: () => void;
    const blocker = new Promise((r) => { block = r; });
    const mockFn = vi.fn().mockImplementation(() => blocker);

    const p = executor.execute('task1', 'Test', mockFn);
    expect(executor.isRunning('task1')).toBe(true);
    block!();
    await p;
    expect(executor.isRunning('task1')).toBe(false);
  });

  it('should get running count', async () => {
    let block: () => void;
    const blocker = new Promise((r) => { block = r; });
    const mockFn = vi.fn().mockImplementation(() => blocker);

    const p1 = executor.execute('task1', 'Test', mockFn);
    expect(executor.getRunningCount()).toBe(1);
    block!();
    await p1;
  });

  it('should abort all running tasks', async () => {
    let block: () => void;
    const blocker = new Promise((r) => { block = r; });
    const mockFn = vi.fn().mockImplementation(() => blocker);

    executor.execute('task1', 'Test', mockFn);
    executor.execute('task2', 'Test', mockFn);
    expect(executor.getRunningCount()).toBe(2);

    const count = executor.abortAll();
    expect(count).toBe(2);
    expect(executor.getRunningCount()).toBe(0);
  });
});

describe('Reporter', () => {
  let reporter: Reporter;

  beforeEach(() => {
    reporter = new Reporter({ format: 'text' });
  });

  it('should create reporter with default config', () => {
    const r = new Reporter();
    expect(r).toBeDefined();
  });

  it('should generate a report', () => {
    const report = reporter.report('Test Report', [
      { name: 'Section 1', content: 'Content 1' },
      { name: 'Section 2', content: 'Content 2' },
    ]);
    expect(report).toBeDefined();
    expect(report.title).toBe('Test Report');
    expect(report.sections).toHaveLength(2);
  });

  it('should summarize data', () => {
    const data = { key1: 'value1', key2: 42 };
    const report = reporter.summarize(data, 'Summary Test');
    expect(report).toBeDefined();
    expect(report.sections).toHaveLength(2);
  });

  it('should get last report', () => {
    reporter.report('Report 1', [{ name: 'S1', content: 'C1' }]);
    reporter.report('Report 2', [{ name: 'S2', content: 'C2' }]);
    const last = reporter.getLastReport();
    expect(last?.title).toBe('Report 2');
  });

  it('should get all reports', () => {
    reporter.report('Report 1', [{ name: 'S1', content: 'C1' }]);
    reporter.report('Report 2', [{ name: 'S2', content: 'C2' }]);
    const all = reporter.getAllReports();
    expect(all).toHaveLength(2);
  });

  it('should get snapshot with metrics', () => {
    reporter.report('Test', [{ name: 'S1', content: 'C1' }]);
    const snapshot = reporter.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.reportsGenerated).toBe(1);
  });

  it('should reset reporter', () => {
    reporter.report('Test', [{ name: 'S1', content: 'C1' }]);
    reporter.reset();
    expect(reporter.getAllReports()).toHaveLength(0);
  });

  it('should export formatted report', () => {
    const report = reporter.report('Test Report', [
      { name: 'Section 1', content: 'Content here', level: 1 },
    ]);
    const text = reporter.exportReport(report);
    expect(text).toContain('Test Report');
    expect(text).toContain('Section 1');
  });

  it('should export metrics', () => {
    reporter.report('Test', [{ name: 'S1', content: 'C1' }]);
    const metrics = reporter.exportMetrics();
    expect(metrics).toHaveProperty('reportsGenerated');
    expect(metrics).toHaveProperty('uptime');
  });

  it('should generate status report', () => {
    const report = reporter.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Reporter Status');
  });

  it('should clear reports', () => {
    reporter.report('Test', [{ name: 'S1', content: 'C1' }]);
    reporter.clearReports();
    expect(reporter.getAllReports()).toHaveLength(0);
  });

  it('should get report count', () => {
    reporter.report('Test', [{ name: 'S1', content: 'C1' }]);
    expect(reporter.getReportCount()).toBe(1);
  });

  it('should set format', () => {
    reporter.setFormat('json');
    const report = reporter.summarize({ test: 'data' });
    expect(report.metadata.format).toBe('json');
  });

  it('should limit section content length', () => {
    const longContent = 'a'.repeat(20000);
    const report = reporter.report('Test', [{ name: 'Long', content: longContent }]);
    expect(report.sections[0].content.length).toBeLessThanOrEqual(10000);
  });
});