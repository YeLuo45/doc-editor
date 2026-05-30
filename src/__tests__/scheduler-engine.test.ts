/**
 * scheduler-engine.test.ts - V93 Scheduler Engine Test Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulerEngine } from '../scheduler-engine/SchedulerEngine';
import { JobQueue } from '../scheduler-engine/JobQueue';
import { JobRunner } from '../scheduler-engine/JobRunner';
import { JobMonitor } from '../scheduler-engine/JobMonitor';

describe('SchedulerEngine', () => {
  let engine: SchedulerEngine;

  beforeEach(() => {
    engine = new SchedulerEngine({
      maxScheduledJobs: 10,
      defaultTimeout: 5000,
      enableHistory: true,
      maxHistorySize: 100,
      enableLogging: true,
    });
  });

  it('should create a scheduler engine with config', () => {
    expect(engine.config.maxScheduledJobs).toBe(10);
    expect(engine.config.enableHistory).toBe(true);
  });

  it('should schedule a job', () => {
    const handler = vi.fn();
    const job = engine.schedule('job1', 'Test Job', handler, Date.now() + 1000);
    expect(job.id).toBe('job1');
    expect(job.name).toBe('Test Job');
    expect(job.status).toBe('pending');
    expect(job.repeat).toBe(false);
  });

  it('should schedule a repeating job', () => {
    const handler = vi.fn();
    const job = engine.schedule('job1', 'Repeating Job', handler, Date.now(), 5000);
    expect(job.repeat).toBe(true);
    expect(job.interval).toBe(5000);
  });

  it('should throw when max jobs reached', () => {
    const smallEngine = new SchedulerEngine({
      maxScheduledJobs: 1,
      defaultTimeout: 5000,
      enableHistory: true,
      maxHistorySize: 100,
      enableLogging: true,
    });
    smallEngine.schedule('job1', 'Job 1', vi.fn(), Date.now());
    expect(() => smallEngine.schedule('job2', 'Job 2', vi.fn(), Date.now())).toThrow('Maximum number of scheduled jobs reached');
  });

  it('should cancel a job', () => {
    engine.schedule('job1', 'Test Job', vi.fn(), Date.now());
    expect(engine.cancel('job1')).toBe(true);
    const job = engine.getScheduled('job1');
    expect(job?.status).toBe('cancelled');
  });

  it('should return false when cancelling non-existent job', () => {
    expect(engine.cancel('nonexistent')).toBe(false);
  });

  it('should get scheduled job by id', () => {
    engine.schedule('job1', 'Test Job', vi.fn(), Date.now());
    const job = engine.getScheduled('job1');
    expect(job?.id).toBe('job1');
  });

  it('should get all scheduled jobs', () => {
    engine.schedule('job1', 'Job 1', vi.fn(), Date.now());
    engine.schedule('job2', 'Job 2', vi.fn(), Date.now());
    const jobs = engine.getScheduled();
    expect(jobs).toHaveLength(2);
  });

  it('should record execution history', () => {
    engine.recordExecution('job1', 100, true);
    const history = engine.getHistory('job1');
    expect(history).toHaveLength(1);
    expect(history[0].success).toBe(true);
  });

  it('should get snapshot', () => {
    engine.schedule('job1', 'Job 1', vi.fn(), Date.now());
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics.totalScheduledJobs).toBe(1);
    expect(snapshot.metrics.pendingJobs).toBe(1);
  });

  it('should reset engine', () => {
    engine.schedule('job1', 'Job 1', vi.fn(), Date.now());
    engine.reset();
    expect(engine.getScheduled()).toHaveLength(0);
  });

  it('should get report', () => {
    const report = engine.getReport();
    expect(report).toContain('Scheduler Engine Report');
  });

  it('should export metrics with version', () => {
    const metrics = engine.exportMetrics();
    expect(metrics.version).toBe('V93');
  });
});

describe('JobQueue', () => {
  let queue: JobQueue;

  beforeEach(() => {
    queue = new JobQueue({
      maxQueueSize: 10,
      defaultPriority: 5,
      enableFairScheduling: true,
      timeout: 5000,
      enableLogging: true,
    });
  });

  it('should create a job queue with config', () => {
    expect(queue.config.maxQueueSize).toBe(10);
    expect(queue.config.enableFairScheduling).toBe(true);
  });

  it('should enqueue a job', () => {
    const job = queue.enqueue('job1', 'Test Job', vi.fn());
    expect(job.id).toBe('job1');
    expect(job.status).toBe('pending');
    expect(queue.size()).toBe(1);
  });

  it('should throw when queue is full', () => {
    const smallQueue = new JobQueue({
      maxQueueSize: 1,
      defaultPriority: 5,
      enableFairScheduling: true,
      timeout: 5000,
      enableLogging: true,
    });
    smallQueue.enqueue('job1', 'Job 1', vi.fn());
    expect(() => smallQueue.enqueue('job2', 'Job 2', vi.fn())).toThrow('Queue is full');
  });

  it('should dequeue a job', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    const job = queue.dequeue();
    expect(job?.id).toBe('job1');
    expect(job?.status).toBe('processing');
  });

  it('should peek at next job', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    queue.enqueue('job2', 'Job 2', vi.fn());
    const peeked = queue.peek();
    expect(peeked?.id).toBe('job1');
  });

  it('should get pending jobs', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    queue.enqueue('job2', 'Job 2', vi.fn());
    queue.dequeue();
    const pending = queue.getPending();
    expect(pending).toHaveLength(1);
  });

  it('should sort by priority', () => {
    queue.enqueue('job1', 'Job 1', vi.fn(), 1);
    queue.enqueue('job2', 'Job 2', vi.fn(), 10);
    const peeked = queue.peek();
    expect(peeked?.priority).toBe(10);
  });

  it('should remove a job', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    expect(queue.remove('job1')).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it('should mark job completed', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    queue.dequeue();
    queue.markCompleted('job1');
    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.completedJobs).toBe(1);
  });

  it('should mark job failed', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    queue.dequeue();
    queue.markFailed('job1');
    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.failedJobs).toBe(1);
  });

  it('should get snapshot', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.pendingJobs).toBe(1);
  });

  it('should reset queue', () => {
    queue.enqueue('job1', 'Job 1', vi.fn());
    queue.reset();
    expect(queue.size()).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = queue.exportMetrics();
    expect(metrics.version).toBe('V93');
  });
});

describe('JobRunner', () => {
  let runner: JobRunner;

  beforeEach(() => {
    runner = new JobRunner({
      maxConcurrentJobs: 5,
      defaultTimeout: 5000,
      enableRetries: true,
      maxRetries: 3,
      retryDelay: 100,
      enableLogging: true,
    });
  });

  it('should create a job runner with config', () => {
    expect(runner.config.maxConcurrentJobs).toBe(5);
    expect(runner.config.enableRetries).toBe(true);
  });

  it('should run a job', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await runner.run('job1', 'Test Job', handler);
    expect(handler).toHaveBeenCalled();
    const stats = runner.getStats();
    expect(stats.successfulRuns).toBe(1);
  });

  it('should throw when max concurrent reached', async () => {
    const smallRunner = new JobRunner({
      maxConcurrentJobs: 1,
      defaultTimeout: 5000,
      enableRetries: true,
      maxRetries: 3,
      retryDelay: 100,
      enableLogging: true,
    });
    const p1 = smallRunner.run('job1', 'Job 1', vi.fn().mockImplementation(() => new Promise(r => setTimeout(r, 100))));
    await new Promise(r => setTimeout(r, 10));
    expect(smallRunner.run('job2', 'Job 2', vi.fn())).rejects.toThrow('Maximum concurrent jobs reached');
    await p1;
  });

  it('should stop a job', () => {
    const handler = vi.fn();
    runner.run('job1', 'Job 1', handler).catch(() => {});
    expect(runner.stop('job1')).toBe(true);
    expect(runner.getStatus('job1')).toBe('stopped');
  });

  it('should pause and resume a job', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    runner.run('job1', 'Job 1', handler);
    expect(runner.pause('job1')).toBe(true);
    expect(runner.getStatus('job1')).toBe('paused');
    expect(runner.resume('job1')).toBe(true);
    expect(runner.getStatus('job1')).toBe('running');
  });

  it('should get job status', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    runner.run('job1', 'Job 1', handler);
    expect(runner.getStatus('job1')).toBe('running');
  });

  it('should get runner stats', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await runner.run('job1', 'Job 1', handler);
    const stats = runner.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats.successfulRuns).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = runner.getSnapshot();
    expect(snapshot.metrics.concurrentUtilization).toBeDefined();
  });

  it('should reset runner', () => {
    runner.reset();
    expect(runner.getAllRunningJobs()).toHaveLength(0);
  });

  it('should export metrics', () => {
    const metrics = runner.exportMetrics();
    expect(metrics.version).toBe('V93');
  });
});

describe('JobMonitor', () => {
  let monitor: JobMonitor;

  beforeEach(() => {
    monitor = new JobMonitor({
      enableMetrics: true,
      enableHistory: true,
      maxHistorySize: 100,
      samplingRate: 1,
      enableLogging: true,
    });
  });

  it('should create a job monitor with config', () => {
    expect(monitor.config.enableMetrics).toBe(true);
    expect(monitor.config.maxHistorySize).toBe(100);
  });

  it('should track a job', () => {
    const metric = monitor.track('job1', 'Test Job', 'started');
    expect(metric.jobId).toBe('job1');
    expect(metric.status).toBe('started');
  });

  it('should update progress', () => {
    monitor.track('job1', 'Test Job', 'running');
    expect(monitor.updateProgress('job1', 50)).toBe(true);
  });

  it('should complete a job', () => {
    monitor.track('job1', 'Test Job', 'started');
    expect(monitor.complete('job1')).toBe(true);
    const metric = monitor.getMetrics('job1') as any;
    expect(metric.status).toBe('completed');
  });

  it('should complete a job with error', () => {
    monitor.track('job1', 'Test Job', 'started');
    expect(monitor.complete('job1', 'Error occurred')).toBe(true);
    const metric = monitor.getMetrics('job1') as any;
    expect(metric.status).toBe('failed');
    expect(metric.error).toBe('Error occurred');
  });

  it('should cancel a job', () => {
    monitor.track('job1', 'Test Job', 'started');
    expect(monitor.cancel('job1')).toBe(true);
    const metric = monitor.getMetrics('job1') as any;
    expect(metric.status).toBe('cancelled');
  });

  it('should get metrics by job id', () => {
    monitor.track('job1', 'Test Job', 'started');
    const metric = monitor.getMetrics('job1');
    expect(metric?.jobId).toBe('job1');
  });

  it('should get all metrics', () => {
    monitor.track('job1', 'Job 1', 'started');
    monitor.track('job2', 'Job 2', 'started');
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(2);
  });

  it('should get history by status', () => {
    monitor.track('job1', 'Job 1', 'started');
    monitor.complete('job1');
    monitor.track('job2', 'Job 2', 'started');
    const completed = monitor.getHistory('completed');
    expect(completed).toHaveLength(1);
  });

  it('should get status summary', () => {
    monitor.track('job1', 'Job 1', 'started');
    monitor.complete('job1');
    const status = monitor.getStatus();
    expect(status.totalTracked).toBe(1);
    expect(status.completedJobs).toBe(1);
  });

  it('should get snapshot', () => {
    monitor.track('job1', 'Job 1', 'started');
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalTracked).toBe(1);
  });

  it('should reset monitor', () => {
    monitor.track('job1', 'Job 1', 'started');
    monitor.reset();
    expect(monitor.getMetrics()).toHaveLength(0);
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V93');
  });
});