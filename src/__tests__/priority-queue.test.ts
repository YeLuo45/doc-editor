/**
 * priority-queue.test.ts - V98 Priority Queue Test Suite
 * 27+ tests covering PriorityQueue, QueueManager, QueueStrategy, QueueMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PriorityQueue, QueueItem } from '../priority-queue/PriorityQueue';
import { QueueManager } from '../priority-queue/QueueManager';
import { QueueStrategy, StrategyType } from '../priority-queue/QueueStrategy';
import { QueueMonitor } from '../priority-queue/QueueMonitor';

describe('PriorityQueue', () => {
  let queue: PriorityQueue<{ task: string }>;

  beforeEach(() => {
    queue = new PriorityQueue({ maxSize: 10, defaultPriority: 5 });
  });

  it('should enqueue items and respect maxSize', () => {
    expect(queue.isFull).toBe(false);
    queue.enqueue({ id: '1', priority: 1, data: { task: 'task1' } });
    expect(queue.size).toBe(1);
    for (let i = 2; i <= 10; i++) {
      queue.enqueue({ id: String(i), priority: i, data: { task: `task${i}` } });
    }
    expect(queue.isFull).toBe(true);
    expect(queue.enqueue({ id: '11', priority: 11, data: { task: 'task11' } })).toBe(false);
  });

  it('should dequeue items by priority', () => {
    queue.enqueue({ id: 'low', priority: 1, data: { task: 'low' } });
    queue.enqueue({ id: 'high', priority: 10, data: { task: 'high' } });
    queue.enqueue({ id: 'medium', priority: 5, data: { task: 'medium' } });

    const first = queue.dequeue();
    expect(first?.id).toBe('high');
    expect(first?.priority).toBe(10);

    const second = queue.dequeue();
    expect(second?.id).toBe('medium');
  });

  it('should peek without removing', () => {
    queue.enqueue({ id: '1', priority: 2, data: { task: 'task1' } });
    queue.enqueue({ id: '2', priority: 1, data: { task: 'task2' } });

    const peeked = queue.peek();
    expect(peeked?.id).toBe('1');
    expect(queue.size).toBe(2);
  });

  it('should support size and getPending', () => {
    expect(queue.size).toBe(0);
    queue.enqueue({ id: '1', priority: 2, data: { task: 'task1' } });
    queue.enqueue({ id: '2', priority: 1, data: { task: 'task2' } });

    const pending = queue.getPending();
    expect(pending.length).toBe(2);
    expect(pending[0].id).toBe('1');
  });

  it('should update priority correctly', () => {
    queue.enqueue({ id: '1', priority: 1, data: { task: 'task1' } });
    queue.enqueue({ id: '2', priority: 5, data: { task: 'task2' } });

    queue.updatePriority('1', 10);
    const first = queue.dequeue();
    expect(first?.id).toBe('1');
  });

  it('should provide snapshot, reset, report, and exportMetrics', () => {
    queue.enqueue({ id: '1', priority: 1, data: { task: 'task1' } });

    const snapshot = queue.getSnapshot();
    expect(snapshot.metrics.size).toBe(1);

    const metrics = queue.exportMetrics();
    expect(metrics.version).toBe('V98');

    const report = queue.getReport();
    expect(report).toContain('PriorityQueue');

    queue.reset();
    expect(queue.size).toBe(0);
  });
});

describe('QueueManager', () => {
  let manager: QueueManager;

  beforeEach(() => {
    manager = new QueueManager({ maxQueues: 5 });
  });

  it('should create and retrieve queues', () => {
    expect(manager.create('q1', 'Queue 1')).toBe(true);
    expect(manager.exists('q1')).toBe(true);
    expect(manager.get('q1')).toBeDefined();
  });

  it('should reject duplicate queue creation', () => {
    manager.create('q1', 'Queue 1');
    expect(manager.create('q1', 'Queue 1 Duplicate')).toBe(false);
  });

  it('should enforce maxQueues limit', () => {
    for (let i = 1; i <= 5; i++) {
      manager.create(`q${i}`, `Queue ${i}`);
    }
    expect(manager.create('q6', 'Queue 6')).toBe(false);
  });

  it('should get stats for existing queue', () => {
    manager.create('q1', 'Queue 1');
    manager.enqueue('q1', { id: 'item1', priority: 1, data: { task: 't1' } });

    const stats = manager.getStats('q1');
    expect(stats).toBeDefined();
    expect(stats?.size).toBe(1);
  });

  it('should list all queues', () => {
    manager.create('q1', 'Queue 1');
    manager.create('q2', 'Queue 2');
    manager.create('q3', 'Queue 3');

    const queues = manager.getQueues();
    expect(queues.length).toBe(3);
  });

  it('should enqueue/dequeue items across queues', () => {
    manager.create('q1', 'Queue 1');
    expect(manager.enqueue('q1', { id: '1', priority: 1, data: { task: 't1' } })).toBe(true);
    expect(manager.dequeue('q1')?.id).toBe('1');
    expect(manager.peek('q1')).toBeUndefined();
  });

  it('should provide snapshot, reset, report, and exportMetrics', () => {
    manager.create('q1', 'Queue 1');
    manager.create('q2', 'Queue 2');

    const snapshot = manager.getSnapshot();
    expect(snapshot.metrics.totalQueues).toBe(2);

    const metrics = manager.exportMetrics();
    expect(metrics.version).toBe('V98');

    const report = manager.getReport();
    expect(report).toContain('QueueManager');

    manager.reset();
    expect(manager.exists('q1')).toBe(true);
    const q1 = manager.get('q1');
    expect(q1?.size).toBe(0);
  });
});

describe('QueueStrategy', () => {
  let manager: QueueManager;
  let strategy: QueueStrategy;

  beforeEach(() => {
    manager = new QueueManager();
    manager.create('q1', 'Queue 1');
    manager.create('q2', 'Queue 2');
    strategy = new QueueStrategy(manager, { strategyType: 'priority' });
  });

  it('should select queue based on priority strategy', () => {
    const queues = ['q1', 'q2'];
    const selected = strategy.select(queues);
    expect(queues).toContain(selected);
  });

  it('should apply strategy to enqueue item', () => {
    const item: QueueItem = { id: '1', priority: 5, data: { task: 't1' }, timestamp: Date.now() };
    const result = strategy.apply(item, ['q1', 'q2']);
    expect(result).toBe(true);
  });

  it('should switch strategy types', () => {
    strategy.setStrategy('round-robin');
    expect(strategy.config.strategyType).toBe('round-robin');

    strategy.setStrategy('least-loaded');
    expect(strategy.config.strategyType).toBe('least-loaded');
  });

  it('should update weights', () => {
    strategy.updateWeights({ q1: 10, q2: 1 });
    expect(strategy.config.weights.q1).toBe(10);
  });

  it('should get strategy stats', () => {
    const stats = strategy.getStats();
    expect(stats.strategyType).toBe('priority');
    expect(stats.metrics).toBeDefined();
  });

  it('should provide snapshot, reset, report, and exportMetrics', () => {
    const snapshot = strategy.getSnapshot();
    expect(snapshot.currentStrategy).toBe('priority');

    const metrics = strategy.exportMetrics();
    expect(metrics.version).toBe('V98');

    const report = strategy.getReport();
    expect(report).toContain('QueueStrategy');

    strategy.reset();
    expect(strategy.getSnapshot().metrics).toBeDefined();
  });
});

describe('QueueMonitor', () => {
  let manager: QueueManager;
  let monitor: QueueMonitor;

  beforeEach(() => {
    manager = new QueueManager();
    manager.create('q1', 'Queue 1');
    monitor = new QueueMonitor(manager);
  });

  it('should track enqueue operations', () => {
    monitor.track('enqueue', 'q1');
    const metrics = monitor.getMetrics();
    expect(metrics.enqueued).toBe(1);
  });

  it('should track dequeue operations', () => {
    monitor.track('dequeue', 'q1');
    monitor.track('dequeue', 'q1');
    const metrics = monitor.getMetrics();
    expect(metrics.dequeued).toBe(2);
  });

  it('should track peek operations', () => {
    monitor.track('peek', 'q1');
    const metrics = monitor.getMetrics();
    expect(metrics.peeked).toBe(1);
  });

  it('should track errors', () => {
    monitor.track('error', 'q1');
    const metrics = monitor.getMetrics();
    expect(metrics.errors).toBe(1);
  });

  it('should get history', () => {
    monitor.track('enqueue', 'q1');
    monitor.track('dequeue', 'q1');
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.status).toBe('active');
    expect(status.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should pause and resume', () => {
    monitor.pause();
    expect(monitor.monitorStatus).toBe('paused');
    monitor.resume();
    expect(monitor.monitorStatus).toBe('active');
  });

  it('should provide snapshot, reset, report, and exportMetrics', () => {
    monitor.track('enqueue', 'q1');

    const snapshot = monitor.getSnapshot();
    expect(snapshot.status).toBe('active');

    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V98');

    const report = monitor.getReport();
    expect(report).toContain('QueueMonitor');

    monitor.reset();
    expect(monitor.getMetrics().enqueued).toBe(0);
  });
});