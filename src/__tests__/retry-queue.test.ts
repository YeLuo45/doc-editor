/**
 * retry-queue.test.ts
 * V94 Retry Queue - Test Suite
 * Tests for BackoffStrategy, RetryPolicy, RetryMonitor, and RetryQueue
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackoffStrategy, BackoffType } from '../retry-queue/BackoffStrategy';
import { RetryPolicy } from '../retry-queue/RetryPolicy';
import { RetryMonitor } from '../retry-queue/RetryMonitor';
import { RetryQueue } from '../retry-queue/RetryQueue';

describe('BackoffStrategy', () => {
  let strategy: BackoffStrategy;

  describe('config property', () => {
    it('should have config property with correct type', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 5000 });
      expect(strategy.config).toBeDefined();
      expect(strategy.config.type).toBe('exponential');
    });

    it('should expose all config fields', () => {
      strategy = new BackoffStrategy({
        type: 'linear',
        initialDelay: 200,
        maxDelay: 10000,
        multiplier: 1.5,
        jitter: 0.2
      });
      expect(strategy.config.type).toBe('linear');
      expect(strategy.config.initialDelay).toBe(200);
      expect(strategy.config.maxDelay).toBe(10000);
      expect(strategy.config.multiplier).toBe(1.5);
      expect(strategy.config.jitter).toBe(0.2);
    });
  });

  describe('business methods', () => {
    it('should calculate exponential backoff delay', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 10000 });
      expect(strategy.calculate(0)).toBe(100);
      expect(strategy.calculate(1)).toBe(200);
      expect(strategy.calculate(2)).toBe(400);
    });

    it('should calculate linear backoff delay', () => {
      strategy = new BackoffStrategy({ type: 'linear', initialDelay: 100, maxDelay: 10000 });
      expect(strategy.calculate(0)).toBe(100);
      expect(strategy.calculate(1)).toBe(200);
      expect(strategy.calculate(2)).toBe(300);
    });

    it('should return fixed delay', () => {
      strategy = new BackoffStrategy({ type: 'fixed', initialDelay: 500, maxDelay: 5000 });
      expect(strategy.calculate(0)).toBe(500);
      expect(strategy.calculate(5)).toBe(500);
    });

    it('should get next delay without incrementing', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 10000 });
      strategy.calculate(2);
      const next = strategy.getNextDelay();
      expect(next).toBe(800); // 100 * 2^3 = 800
    });

    it('should reset strategy state', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 10000 });
      strategy.calculate(5);
      strategy.reset();
      expect(strategy.calculate(0)).toBe(100);
    });

    it('should get current strategy type', () => {
      strategy = new BackoffStrategy({ type: 'fibonacci', initialDelay: 100, maxDelay: 10000 });
      expect(strategy.getStrategy()).toBe('fibonacci');
    });
  });

  describe('required methods', () => {
    it('should return snapshot with metrics', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 5000 });
      const snapshot = strategy.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.metrics).toHaveProperty('strategy');
      expect(snapshot.metrics).toHaveProperty('currentDelay');
      expect(snapshot.metrics).toHaveProperty('attempt');
    });

    it('should reset all state', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 5000 });
      strategy.calculate(3);
      strategy.reset();
      const snapshot = strategy.getSnapshot();
      expect(snapshot.metrics.attempt).toBe(0);
    });

    it('should return report string', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 5000 });
      const report = strategy.getReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('BackoffStrategy');
    });

    it('should export metrics with version', () => {
      strategy = new BackoffStrategy({ type: 'exponential', initialDelay: 100, maxDelay: 5000 });
      const metrics = strategy.exportMetrics();
      expect(metrics).toHaveProperty('version');
      expect(metrics.version).toBe('V94-1.0');
    });
  });
});

describe('RetryPolicy', () => {
  let policy: RetryPolicy;

  describe('config property', () => {
    it('should have config property', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      expect(policy.config).toBeDefined();
      expect(policy.config.maxAttempts).toBe(5);
    });
  });

  describe('business methods', () => {
    it('should determine if should retry', () => {
      policy = new RetryPolicy({ maxAttempts: 3, initialDelay: 100, maxDelay: 5000 });
      expect(policy.shouldRetry()).toBe(true);
    });

    it('should not retry after max attempts', () => {
      policy = new RetryPolicy({ maxAttempts: 2, initialDelay: 100, maxDelay: 5000 });
      policy.nextAttempt();
      policy.nextAttempt();
      expect(policy.shouldRetry()).toBe(false);
    });

    it('should get delay for current attempt', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      const delay = policy.getDelay();
      expect(delay).toBeGreaterThan(0);
    });

    it('should calculate next attempt state', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      const state = policy.nextAttempt();
      expect(state).toHaveProperty('shouldRetry');
      expect(state).toHaveProperty('delay');
      expect(state).toHaveProperty('nextAttempt');
      expect(state).toHaveProperty('maxAttempts');
    });

    it('should get max attempts', () => {
      policy = new RetryPolicy({ maxAttempts: 10, initialDelay: 100, maxDelay: 5000 });
      expect(policy.getMaxAttempts()).toBe(10);
    });

    it('should respect non-retryable errors', () => {
      policy = new RetryPolicy({
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 5000,
        nonRetryableErrors: ['ValidationError']
      });
      expect(policy.shouldRetry(new Error('ValidationError: invalid'))).toBe(false);
    });
  });

  describe('required methods', () => {
    it('should return snapshot with metrics', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      const snapshot = policy.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.metrics).toHaveProperty('currentAttempt');
      expect(snapshot.metrics).toHaveProperty('shouldRetry');
    });

    it('should reset state', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      policy.nextAttempt();
      policy.reset();
      const snapshot = policy.getSnapshot();
      expect(snapshot.metrics.currentAttempt).toBe(0);
    });

    it('should return report string', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      const report = policy.getReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('RetryPolicy');
    });

    it('should export metrics with version', () => {
      policy = new RetryPolicy({ maxAttempts: 5, initialDelay: 100, maxDelay: 5000 });
      const metrics = policy.exportMetrics();
      expect(metrics).toHaveProperty('version');
      expect(metrics.version).toBe('V94-1.0');
    });
  });
});

describe('RetryMonitor', () => {
  let monitor: RetryMonitor;

  describe('config property', () => {
    it('should have config property', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      expect(monitor.config).toBeDefined();
      expect(monitor.config.maxHistorySize).toBe(100);
    });
  });

  describe('business methods', () => {
    it('should track successful operation', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      monitor.track('saveDoc', true, 50, 1);
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulOperations).toBe(1);
    });

    it('should track failed operation', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      monitor.track('saveDoc', false, 30, 2, 'Network error');
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.failedOperations).toBe(1);
    });

    it('should get metrics summary', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      monitor.track('op1', true, 100, 1);
      monitor.track('op2', false, 50, 2);
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.successRate).toBe(0.5);
    });

    it('should get operation history', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      monitor.track('op1', true, 100, 1);
      monitor.track('op2', false, 50, 1);
      const history = monitor.getHistory();
      expect(history.length).toBe(2);
    });

    it('should limit history size', () => {
      monitor = new RetryMonitor({ maxHistorySize: 3 });
      for (let i = 0; i < 5; i++) {
        monitor.track(`op${i}`, true, 50, 1);
      }
      const history = monitor.getHistory();
      expect(history.length).toBe(3);
    });

    it('should get status', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      monitor.track('op1', true, 100, 1);
      const status = monitor.getStatus();
      expect(status).toHaveProperty('isHealthy');
      expect(status).toHaveProperty('totalTracked');
    });
  });

  describe('required methods', () => {
    it('should return snapshot with metrics', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      const snapshot = monitor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.metrics).toHaveProperty('totalOperations');
    });

    it('should reset all metrics', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      monitor.track('op1', true, 100, 1);
      monitor.reset();
      const metrics = monitor.getMetrics();
      expect(metrics.totalOperations).toBe(0);
    });

    it('should return report string', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      const report = monitor.getReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('RetryMonitor');
    });

    it('should export metrics with version', () => {
      monitor = new RetryMonitor({ maxHistorySize: 100 });
      const metrics = monitor.exportMetrics();
      expect(metrics).toHaveProperty('version');
      expect(metrics.version).toBe('V94-1.0');
    });
  });
});

describe('RetryQueue', () => {
  let queue: RetryQueue;

  describe('config property', () => {
    it('should have config property', () => {
      queue = new RetryQueue({ maxSize: 50, maxAttempts: 3 });
      expect(queue.config).toBeDefined();
      expect(queue.config.maxSize).toBe(50);
      expect(queue.config.maxAttempts).toBe(3);
    });
  });

  describe('business methods', () => {
    it('should enqueue operation', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const id = queue.enqueue('saveDoc', { docId: '123' });
      expect(typeof id).toBe('string');
      expect(id).toContain('retry-');
    });

    it('should throw when queue is full', () => {
      queue = new RetryQueue({ maxSize: 2, maxAttempts: 3 });
      queue.enqueue('op1');
      queue.enqueue('op2');
      expect(() => queue.enqueue('op3')).toThrow('Queue is full');
    });

    it('should retry operation', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const id = queue.enqueue('saveDoc');
      const result = queue.retry(id);
      expect(result).toBe(true);
    });

    it('should not retry completed operation', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const id = queue.enqueue('saveDoc');
      queue.complete(id, 100);
      const result = queue.retry(id);
      expect(result).toBe(false);
    });

    it('should remove operation', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const id = queue.enqueue('saveDoc');
      const result = queue.remove(id);
      expect(result).toBe(true);
      const pending = queue.getPending();
      expect(pending.find(op => op.id === id)).toBeUndefined();
    });

    it('should get pending operations', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      queue.enqueue('op1');
      queue.enqueue('op2');
      const pending = queue.getPending();
      expect(pending.length).toBe(2);
    });

    it('should get queue stats', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      queue.enqueue('op1');
      queue.enqueue('op2');
      queue.enqueue('op3');
      queue.complete(queue.getPending()[0].id, 100);
      const stats = queue.getStats();
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('completed');
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
    });

    it('should complete operation', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const id = queue.enqueue('saveDoc');
      const result = queue.complete(id, 150);
      expect(result).toBe(true);
      const stats = queue.getStats();
      expect(stats.completed).toBe(1);
    });

    it('should fail operation', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const id = queue.enqueue('saveDoc');
      const result = queue.fail(id, 'Server error');
      expect(result).toBe(true);
      const stats = queue.getStats();
      expect(stats.failed).toBe(1);
    });
  });

  describe('required methods', () => {
    it('should return snapshot with metrics', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const snapshot = queue.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.metrics).toHaveProperty('stats');
      expect(snapshot.metrics).toHaveProperty('currentSize');
    });

    it('should reset queue', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      queue.enqueue('op1');
      queue.reset();
      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
    });

    it('should return report string', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const report = queue.getReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('RetryQueue');
    });

    it('should export metrics with version', () => {
      queue = new RetryQueue({ maxSize: 10, maxAttempts: 3 });
      const metrics = queue.exportMetrics();
      expect(metrics).toHaveProperty('version');
      expect(metrics.version).toBe('V94-1.0');
    });
  });
});