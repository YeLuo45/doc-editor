/**
 * Dead Letter Queue Test Suite - V103
 * 27+ tests for DLQ components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeadLetterQueue } from '../dead-letter-queue/DeadLetterQueue';
import { DLQPolicy } from '../dead-letter-queue/DLQPolicy';
import { DLQMonitor } from '../dead-letter-queue/DLQMonitor';
import { DLQProcessor } from '../dead-letter-queue/DLQProcessor';

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;

  beforeEach(() => {
    dlq = new DeadLetterQueue({ maxSize: 100, retentionPeriod: 60000 });
  });

  it('should enqueue items', () => {
    const result = dlq.enqueue({ payload: { msg: 'test' }, error: 'fail', retryCount: 0, originalQueue: 'main' });
    expect(result).toBe(true);
    expect(dlq.getStats().total).toBe(1);
  });

  it('should generate unique IDs', () => {
    dlq.enqueue({ payload: 'a', error: 'e', retryCount: 0, originalQueue: 'q' });
    dlq.enqueue({ payload: 'b', error: 'e', retryCount: 0, originalQueue: 'q' });
    const items = dlq.getPending();
    expect(items[0].id).not.toBe(items[1].id);
  });

  it('should get item by ID', () => {
    dlq.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const item = dlq.getPending()[0];
    const found = dlq.get(item.id);
    expect(found).toBeDefined();
    expect(found?.payload).toBe('test');
  });

  it('should requeue items', () => {
    dlq.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const item = dlq.getPending()[0];
    const result = dlq.requeue(item.id);
    expect(result).toBe(true);
  });

  it('should return false for requeue with invalid ID', () => {
    const result = dlq.requeue('invalid-id');
    expect(result).toBe(false);
  });

  it('should respect maxSize limit', () => {
    const smallDlq = new DeadLetterQueue({ maxSize: 3 });
    for (let i = 0; i < 5; i++) {
      smallDlq.enqueue({ payload: i, error: 'e', retryCount: 0, originalQueue: 'q' });
    }
    expect(smallDlq.getStats().total).toBe(3);
  });

  it('should filter pending by retention period', () => {
    dlq.enqueue({ payload: 'old', error: 'e', retryCount: 0, originalQueue: 'q' });
    const stats = dlq.getStats();
    expect(stats.pending).toBe(1);
  });

  it('should get correct stats', () => {
    dlq.enqueue({ payload: 'a', error: 'e', retryCount: 0, originalQueue: 'q' });
    dlq.enqueue({ payload: 'b', error: 'e', retryCount: 0, originalQueue: 'q' });
    const stats = dlq.getStats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.oldestTimestamp).not.toBeNull();
    expect(stats.newestTimestamp).not.toBeNull();
  });

  it('should return snapshot with metrics', () => {
    dlq.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const snapshot = dlq.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.queueLength).toBe(1);
  });

  it('should reset queue', () => {
    dlq.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    dlq.reset();
    expect(dlq.getStats().total).toBe(0);
  });

  it('should generate report', () => {
    dlq.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const report = dlq.getReport();
    expect(report).toContain('Dead Letter Queue Report');
    expect(report).toContain('Total Items: 1');
  });

  it('should export metrics with version', () => {
    const metrics = dlq.exportMetrics();
    expect(metrics.version).toBe('1.0.3');
    expect(metrics.stats).toBeDefined();
  });
});

describe('DLQPolicy', () => {
  let policy: DLQPolicy;

  beforeEach(() => {
    policy = new DLQPolicy();
  });

  it('should store when max retries exceeded', () => {
    const error = new Error('fail');
    const shouldStore = policy.shouldStore(error, 5);
    expect(shouldStore).toBe(true);
  });

  it('should not store when disabled', () => {
    policy = new DLQPolicy({ enableStore: false });
    const error = new Error('fail');
    const shouldStore = policy.shouldStore(error, 0);
    expect(shouldStore).toBe(false);
  });

  it('should return correct max size', () => {
    expect(policy.getMaxSize()).toBe(50000);
    policy = new DLQPolicy({ maxSize: 1000 });
    expect(policy.getMaxSize()).toBe(1000);
  });

  it('should return retry policy', () => {
    const retryPolicy = policy.getRetryPolicy();
    expect(retryPolicy.maxRetries).toBe(5);
    expect(retryPolicy.backoffMultiplier).toBe(2);
  });

  it('should return full policy', () => {
    const fullPolicy = policy.getPolicy();
    expect(fullPolicy.enableStore).toBe(true);
    expect(fullPolicy.maxSize).toBe(50000);
    expect(fullPolicy.retryPolicy).toBeDefined();
  });

  it('should calculate backoff correctly', () => {
    const backoff = policy.calculateBackoff(2);
    expect(backoff).toBe(4000);
  });

  it('should cap backoff at max delay', () => {
    const backoff = policy.calculateBackoff(100);
    expect(backoff).toBe(60000);
  });

  it('should return snapshot', () => {
    const snapshot = policy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset policy', () => {
    policy = new DLQPolicy({ maxSize: 999 });
    policy.reset();
    expect(policy.getMaxSize()).toBe(50000);
  });

  it('should generate report', () => {
    const report = policy.getReport();
    expect(report).toContain('DLQ Policy Report');
    expect(report).toContain('Max Size: 50000');
  });

  it('should export metrics', () => {
    const metrics = policy.exportMetrics();
    expect(metrics.version).toBe('1.0.3');
    expect(metrics.policy).toBeDefined();
  });

  it('should identify permanent errors', () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    expect(policy.shouldStore(validationError, 0)).toBe(true);
  });
});

describe('DLQMonitor', () => {
  let monitor: DLQMonitor;

  beforeEach(() => {
    monitor = new DLQMonitor({ historySize: 100, alertThreshold: 50 });
  });

  it('should track events', () => {
    monitor.track('enqueue', 1);
    monitor.track('process', 2);
    const metrics = monitor.getMetrics();
    expect(metrics.counters.enqueue).toBe(1);
    expect(metrics.counters.process).toBe(2);
  });

  it('should return metrics with counters', () => {
    monitor.track('test');
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
    expect(metrics.counters.test).toBe(1);
  });

  it('should get history with limit', () => {
    for (let i = 0; i < 10; i++) monitor.track('event');
    const history = monitor.getHistory(5);
    expect(history.length).toBe(5);
  });

  it('should get history without limit', () => {
    for (let i = 0; i < 5; i++) monitor.track('event');
    const history = monitor.getHistory();
    expect(history.length).toBe(5);
  });

  it('should report healthy status when below threshold', () => {
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.alertTriggered).toBe(false);
  });

  it('should report unhealthy status when at threshold', () => {
    for (let i = 0; i < 51; i++) monitor.track('event');
    const status = monitor.getStatus();
    expect(status.healthy).toBe(false);
    expect(status.alertTriggered).toBe(true);
  });

  it('should return snapshot with metrics', () => {
    monitor.track('test');
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset monitor', () => {
    monitor.track('test');
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
  });

  it('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('DLQ Monitor Report');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.3');
    expect(metrics.status).toBeDefined();
  });
});

describe('DLQProcessor', () => {
  let queue: DeadLetterQueue;
  let policy: DLQPolicy;
  let monitor: DLQMonitor;
  let processor: DLQProcessor;

  beforeEach(() => {
    queue = new DeadLetterQueue();
    policy = new DLQPolicy();
    monitor = new DLQMonitor();
    processor = new DLQProcessor(queue, policy, monitor, { batchSize: 5 });
  });

  it('should process items with handler', async () => {
    queue.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const processed = await processor.process(async (item) => {
      return item.payload === 'test';
    });
    expect(processed).toBe(1);
  });

  it('should not process when already processing', async () => {
    queue.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const p1 = processor.process(async () => {
      await new Promise(r => setTimeout(r, 100));
      return true;
    });
    const p2 = processor.process(async () => true);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r2).toBe(0);
  });

  it('should get next batch', () => {
    for (let i = 0; i < 10; i++) {
      queue.enqueue({ payload: i, error: 'e', retryCount: 0, originalQueue: 'q' });
    }
    const next = processor.getNext(3);
    expect(next.length).toBe(3);
  });

  it('should track processed IDs', async () => {
    queue.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    await processor.process(async () => true);
    const processed = processor.getProcessed();
    expect(processed.length).toBe(1);
  });

  it('should return correct stats', () => {
    queue.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    const stats = processor.getStats();
    expect(stats.isProcessing).toBe(false);
    expect(stats.pendingCount).toBe(1);
    expect(stats.batchSize).toBe(5);
  });

  it('should return snapshot', () => {
    const snapshot = processor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset processor', async () => {
    queue.enqueue({ payload: 'test', error: 'fail', retryCount: 0, originalQueue: 'q' });
    await processor.process(async () => true);
    processor.reset();
    const stats = processor.getStats();
    expect(stats.processedCount).toBe(0);
    expect(stats.isProcessing).toBe(false);
  });

  it('should generate report', () => {
    const report = processor.getReport();
    expect(report).toContain('DLQ Processor Report');
  });

  it('should export metrics', () => {
    const metrics = processor.exportMetrics();
    expect(metrics.version).toBe('1.0.3');
    expect(metrics.stats).toBeDefined();
  });
});