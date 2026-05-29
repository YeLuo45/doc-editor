/**
 * V73 Task Scheduler Test Suite
 * Tests for TaskScheduler, TaskQueue, TaskExecutor, and TaskMonitor
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TaskScheduler } from '../task-scheduler/TaskScheduler';
import { TaskQueue } from '../task-scheduler/TaskQueue';
import { TaskExecutor } from '../task-scheduler/TaskExecutor';
import { TaskMonitor } from '../task-scheduler/TaskMonitor';

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler({ enableLogging: false });
  });

  afterEach(() => {
    scheduler.reset();
  });

  test('should schedule a task successfully', () => {
    const result = scheduler.schedule('t1', 'Test Task', 'test', async () => 'done');
    expect(result).toBe(true);
    expect(scheduler.getScheduled()).toHaveLength(1);
  });

  test('should not schedule duplicate task IDs', () => {
    scheduler.schedule('t1', 'Task 1', 'test', async () => {});
    const result = scheduler.schedule('t1', 'Task 2', 'test', async () => {});
    expect(result).toBe(false);
    expect(scheduler.getScheduled()).toHaveLength(1);
  });

  test('should cancel a scheduled task', () => {
    scheduler.schedule('t1', 'Task 1', 'test', async () => {});
    const cancelled = scheduler.cancel('t1');
    expect(cancelled).toBe(true);
    expect(scheduler.getScheduled()).toHaveLength(0);
  });

  test('should return false when cancelling non-existent task', () => {
    const result = scheduler.cancel('nonexistent');
    expect(result).toBe(false);
  });

  test('should track task history', async () => {
    scheduler.schedule('t1', 'Task 1', 'test', async () => 'result');
    scheduler.cancel('t1');
    const history = scheduler.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  test('should provide snapshot metrics', () => {
    scheduler.schedule('t1', 'Task 1', 'test', async () => {});
    scheduler.schedule('t2', 'Task 2', 'test', async () => {});
    const snapshot = scheduler.getSnapshot();
    expect(snapshot.metrics.totalScheduled).toBe(2);
  });

  test('should reset all state', () => {
    scheduler.schedule('t1', 'Task 1', 'test', async () => {});
    scheduler.reset();
    expect(scheduler.getScheduled()).toHaveLength(0);
    expect(scheduler.getHistory()).toHaveLength(0);
  });

  test('should generate report string', () => {
    const report = scheduler.getReport();
    expect(report).toContain('TaskScheduler Report');
  });

  test('should export metrics with version', () => {
    const exported = scheduler.exportMetrics();
    expect(exported.version).toBe('V73-task-scheduler');
    expect(exported.metrics).toBeDefined();
  });
});

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  afterEach(() => {
    queue.reset();
  });

  test('should enqueue a task', () => {
    const result = queue.enqueue('q1', 'Queue Task 1', { data: 'test' });
    expect(result).toBe(true);
    expect(queue.size()).toBe(1);
  });

  test('should reject enqueue when queue is full', () => {
    const smallQueue = new TaskQueue({ maxSize: 1 });
    smallQueue.enqueue('q1', 'Task 1', {});
    const result = smallQueue.enqueue('q2', 'Task 2', {});
    expect(result).toBe(false);
  });

  test('should dequeue tasks by priority', () => {
    queue.enqueue('q1', 'Low', {}, { priority: 'low' });
    queue.enqueue('q2', 'High', {}, { priority: 'high' });
    queue.enqueue('q3', 'Normal', {}, { priority: 'normal' });
    const first = queue.dequeue();
    expect(first?.name).toBe('High');
  });

  test('should peek without removing', () => {
    queue.enqueue('q1', 'Task 1', {});
    const peeked = queue.peek();
    expect(peeked?.name).toBe('Task 1');
    expect(queue.size()).toBe(1);
  });

  test('should get all pending tasks', () => {
    queue.enqueue('q1', 'Task 1', {});
    queue.enqueue('q2', 'Task 2', {});
    const pending = queue.getPending();
    expect(pending).toHaveLength(2);
  });

  test('should remove task by id', () => {
    queue.enqueue('q1', 'Task 1', {});
    const removed = queue.remove('q1');
    expect(removed).toBe(true);
    expect(queue.size()).toBe(0);
  });

  test('should reprioritize a task', () => {
    queue.enqueue('q1', 'Task 1', {}, { priority: 'low' });
    const result = queue.reprioritize('q1', 'high');
    expect(result).toBe(true);
    const first = queue.peek();
    expect(first?.priority).toBe('high');
  });

  test('should provide snapshot metrics', () => {
    queue.enqueue('q1', 'Task 1', {});
    queue.dequeue();
    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.enqueued).toBe(1);
    expect(snapshot.metrics.dequeued).toBe(1);
  });

  test('should reset queue state', () => {
    queue.enqueue('q1', 'Task 1', {});
    queue.reset();
    expect(queue.size()).toBe(0);
  });

  test('should generate report string', () => {
    const report = queue.getReport();
    expect(report).toContain('TaskQueue Report');
  });

  test('should export metrics with version', () => {
    const exported = queue.exportMetrics();
    expect(exported.version).toBe('V73-task-queue');
    expect(exported.metrics).toBeDefined();
  });
});

describe('TaskExecutor', () => {
  let executor: TaskExecutor;

  beforeEach(() => {
    executor = new TaskExecutor({ enableRetry: false });
  });

  afterEach(() => {
    executor.reset();
  });

  test('should execute a task successfully', async () => {
    const result = await executor.execute('e1', 'Exec Task 1', async () => 'success');
    expect(result).toBe('success');
  });

  test('should reject execution when stopped', async () => {
    // Manually set status to stopped
    (executor as unknown as { status: string }).status = 'stopped';
    await expect(
      executor.execute('e1', 'Task', async () => {})
    ).rejects.toThrow('Executor is stopped');
  });

  test('should pause and resume execution', async () => {
    // Execute a long-running task with very short duration
    const p = executor.execute('e1', 'Long Task', async () => new Promise(r => setTimeout(() => r('done'), 500)));
    // Small delay to let task start
    await new Promise(r => setTimeout(r, 10));
    executor.pause();
    expect(executor.getStatus()).toBe('paused');
    executor.resume();
    expect(executor.getStatus()).toBe('running');
    await p;
  });

  test('should return false when pausing invalid state', () => {
    // Initial state is 'idle', so pause should return false
    const result = executor.pause();
    expect(result).toBe(false);
  });

  test('should cancel a running task', async () => {
    const longRunning = () => new Promise(r => setTimeout(() => r('done'), 10000));
    const taskId = 'e1';
    const p = executor.execute(taskId, 'Long Task', longRunning, { timeout: 500 });
    executor.cancel(taskId);
    await expect(p).rejects.toThrow();
  });

  test('should get current status after execution', async () => {
    expect(executor.getStatus()).toBe('idle');
    // Start execution to change status
    const p = executor.execute('e1', 'Task', async () => 'result');
    expect(executor.getStatus()).toBe('running');
    await p;
  });

  test('should provide snapshot metrics', async () => {
    await executor.execute('e1', 'Task', async () => 'x');
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics.totalExecuted).toBe(1);
  });

  test('should reset executor state', async () => {
    await executor.execute('e1', 'Task', async () => 'x');
    executor.reset();
    expect(executor.getStatus()).toBe('idle');
    expect(executor.getSnapshot().metrics.totalExecuted).toBe(0);
  });

  test('should generate report string', () => {
    const report = executor.getReport();
    expect(report).toContain('TaskExecutor Report');
  });

  test('should export metrics with version', () => {
    const exported = executor.exportMetrics();
    expect(exported.version).toBe('V73-task-executor');
    expect(exported.metrics).toBeDefined();
  });
});

describe('TaskMonitor', () => {
  let monitor: TaskMonitor;

  beforeEach(() => {
    monitor = new TaskMonitor();
  });

  afterEach(() => {
    monitor.reset();
  });

  test('should track a task', () => {
    monitor.track('m1', 'Monitored Task 1');
    const running = monitor.getRunning();
    expect(running).toHaveLength(1);
    expect(running[0].name).toBe('Monitored Task 1');
  });

  test('should get metrics after tracking', () => {
    monitor.track('m1', 'Task 1');
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
    expect(metrics.currentlyRunning).toBe(1);
  });

  test('should get all running tasks', () => {
    monitor.track('m1', 'Task 1');
    monitor.track('m2', 'Task 2');
    const running = monitor.getRunning();
    expect(running).toHaveLength(2);
  });

  test('should complete a tracked task', () => {
    monitor.track('m1', 'Task 1');
    monitor.complete('m1', { result: 'done' });
    const metrics = monitor.getMetrics();
    expect(metrics.completed).toBe(1);
  });

  test('should fail a tracked task', () => {
    monitor.track('m1', 'Task 1');
    monitor.fail('m1', 'Error occurred');
    const metrics = monitor.getMetrics();
    expect(metrics.failed).toBe(1);
  });

  test('should get completed tasks with limit', () => {
    monitor.track('m1', 'Task 1');
    monitor.complete('m1', {});
    monitor.track('m2', 'Task 2');
    monitor.complete('m2', {});
    const completed = monitor.getCompleted(1);
    expect(completed).toHaveLength(1);
  });

  test('should provide snapshot metrics', () => {
    monitor.track('m1', 'Task 1');
    monitor.complete('m1', {});
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalTracked).toBe(1);
  });

  test('should reset monitor state', () => {
    monitor.track('m1', 'Task 1');
    monitor.reset();
    expect(monitor.getRunning()).toHaveLength(0);
    expect(monitor.getMetrics().totalTracked).toBe(0);
  });

  test('should generate report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('TaskMonitor Report');
  });

  test('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported.version).toBe('V73-task-monitor');
    expect(exported.metrics).toBeDefined();
  });
});