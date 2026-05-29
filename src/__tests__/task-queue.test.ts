import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue, Task } from '../task-queue/TaskQueue';
import { TaskProcessor } from '../task-queue/TaskProcessor';
import { TaskScheduler } from '../task-queue/TaskScheduler';
import { TaskMonitor } from '../task-queue/TaskMonitor';

describe('TaskQueue', () => {
  let queue: TaskQueue<{ value: number }>;

  beforeEach(() => {
    queue = new TaskQueue({ maxSize: 10 });
  });

  it('should enqueue and dequeue tasks', () => {
    const task: Task<{ value: number }> = { id: '1', data: { value: 1 }, createdAt: Date.now() };
    expect(queue.enqueue(task)).toBe(true);
    expect(queue.size()).toBe(1);
    const dequeued = queue.dequeue();
    expect(dequeued?.id).toBe('1');
    expect(queue.size()).toBe(0);
  });

  it('should respect maxSize config', () => {
    const fullQueue = new TaskQueue({ maxSize: 2 });
    fullQueue.enqueue({ id: '1', data: {}, createdAt: Date.now() });
    fullQueue.enqueue({ id: '2', data: {}, createdAt: Date.now() });
    expect(fullQueue.enqueue({ id: '3', data: {}, createdAt: Date.now() })).toBe(false);
  });

  it('should peek without removing', () => {
    queue.enqueue({ id: '1', data: {}, createdAt: Date.now() });
    expect(queue.peek()?.id).toBe('1');
    expect(queue.size()).toBe(1);
  });

  it('should sort by priority', () => {
    queue.enqueue({ id: '1', data: {}, createdAt: Date.now(), priority: 1 });
    queue.enqueue({ id: '2', data: {}, createdAt: Date.now(), priority: 10 });
    queue.enqueue({ id: '3', data: {}, createdAt: Date.now(), priority: 5 });
    expect(queue.dequeue()?.id).toBe('2');
    expect(queue.dequeue()?.id).toBe('3');
  });

  it('should getPending return all tasks', () => {
    queue.enqueue({ id: '1', data: {}, createdAt: Date.now() });
    queue.enqueue({ id: '2', data: {}, createdAt: Date.now() });
    expect(queue.getPending().length).toBe(2);
  });

  it('should getSnapshot return metrics', () => {
    queue.enqueue({ id: '1', data: {}, createdAt: Date.now() });
    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.size).toBe(1);
  });

  it('should reset clear all tasks', () => {
    queue.enqueue({ id: '1', data: {}, createdAt: Date.now() });
    queue.reset();
    expect(queue.size()).toBe(0);
  });

  it('should getReport return string', () => {
    const report = queue.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('TaskQueue');
  });

  it('should exportMetrics return version', () => {
    const metrics = queue.exportMetrics();
    expect(metrics.version).toBeDefined();
  });
});

describe('TaskProcessor', () => {
  let processor: TaskProcessor;

  beforeEach(() => {
    processor = new TaskProcessor({ maxWorkers: 3 });
  });

  it('should process tasks asynchronously', async () => {
    const result = await processor.process({ id: '1', data: 42 }, async (d) => d * 2);
    expect(result.success).toBe(true);
    expect(result.result).toBe(84);
  });

  it('should handle errors', async () => {
    const result = await processor.process({ id: '2', data: 42 }, async () => {
      throw new Error('fail');
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('fail');
  });

  it('should getStats', () => {
    const stats = processor.getStats();
    expect(stats).toHaveProperty('processed');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('running');
  });

  it('should getWorkers list', async () => {
    await processor.process({ id: '1', data: 1 }, async (d) => d);
    const workers = processor.getWorkers();
    expect(Array.isArray(workers)).toBe(true);
  });

  it('should getStatus idle when no running', () => {
    expect(processor.getStatus()).toBe('idle');
  });

  it('should getStatus busy when processing', async () => {
    const p = new TaskProcessor();
    const prom = p.process({ id: '1', data: 1 }, async (d) => {
      await new Promise((r) => setTimeout(r, 50));
      return d;
    });
    expect(p.getStatus()).toBe('busy');
    await prom;
  });

  it('should getSnapshot return metrics', () => {
    const snapshot = processor.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('processed');
  });

  it('should reset clear stats and workers', () => {
    processor.reset();
    const stats = processor.getStats();
    expect(stats.processed).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it('should getReport return string', () => {
    const report = processor.getReport();
    expect(report).toContain('TaskProcessor');
  });

  it('should exportMetrics return version', () => {
    const metrics = processor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler({ maxScheduled: 5 });
  });

  it('should schedule tasks', () => {
    expect(scheduler.schedule({ id: '1', delay: 100 })).toBe(true);
    expect(scheduler.getScheduled().length).toBe(1);
  });

  it('should respect maxScheduled limit', () => {
    const limited = new TaskScheduler({ maxScheduled: 1 });
    limited.schedule({ id: '1' });
    expect(limited.schedule({ id: '2' })).toBe(false);
  });

  it('should cancel scheduled tasks', () => {
    scheduler.schedule({ id: '1' });
    expect(scheduler.cancel('1')).toBe(true);
    expect(scheduler.getScheduled().length).toBe(0);
    expect(scheduler.getHistory().some((h) => h.cancelled)).toBe(true);
  });

  it('should return false when cancelling non-existent', () => {
    expect(scheduler.cancel('999')).toBe(false);
  });

  it('should getHistory return array', () => {
    scheduler.schedule({ id: '1' });
    scheduler.cancel('1');
    expect(Array.isArray(scheduler.getHistory())).toBe(true);
  });

  it('should getSnapshot return metrics', () => {
    scheduler.schedule({ id: '1' });
    const snapshot = scheduler.getSnapshot();
    expect(snapshot.metrics.scheduled).toBe(1);
  });

  it('should reset clear all', () => {
    scheduler.schedule({ id: '1' });
    scheduler.reset();
    expect(scheduler.getScheduled().length).toBe(0);
  });

  it('should getReport return string', () => {
    const report = scheduler.getReport();
    expect(report).toContain('TaskScheduler');
  });

  it('should exportMetrics return version', () => {
    const metrics = scheduler.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('TaskMonitor', () => {
  let monitor: TaskMonitor;

  beforeEach(() => {
    monitor = new TaskMonitor({ maxHistory: 10 });
  });

  it('should track tasks', () => {
    monitor.track('1', { type: 'test' });
    expect(monitor.getRunning().length).toBe(1);
  });

  it('should complete tasks', () => {
    monitor.track('1');
    monitor.complete('1', true);
    const m = monitor.getMetrics();
    expect(m.completed).toBe(1);
    expect(m.running).toBe(0);
  });

  it('should handle failed tasks', () => {
    monitor.track('1');
    monitor.complete('1', false);
    const m = monitor.getMetrics();
    expect(m.failed).toBe(1);
  });

  it('should getMetrics return summary', () => {
    monitor.track('1');
    monitor.track('2');
    monitor.complete('1', true);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
    expect(metrics.running).toBe(1);
  });

  it('should getRunning return active tasks', () => {
    monitor.track('1');
    monitor.track('2');
    expect(monitor.getRunning().length).toBe(2);
  });

  it('should getCompleted return finished tasks', () => {
    monitor.track('1');
    monitor.complete('1', true);
    expect(monitor.getCompleted().length).toBe(1);
  });

  it('should getSnapshot return metrics', () => {
    monitor.track('1');
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('totalTracked');
  });

  it('should reset clear all', () => {
    monitor.track('1');
    monitor.reset();
    expect(monitor.getRunning().length).toBe(0);
    expect(monitor.getCompleted().length).toBe(0);
  });

  it('should getReport return string', () => {
    monitor.track('1');
    monitor.complete('1', true);
    const report = monitor.getReport();
    expect(report).toContain('TaskMonitor');
  });

  it('should exportMetrics return version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});