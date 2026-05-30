/**
 * V96 Transaction Manager Tests
 * Tests for TransactionManager, TransactionLog, TransactionLock, TransactionMonitor
 */

import { TransactionManager } from '../transaction-manager/TransactionManager';
import { TransactionLog } from '../transaction-manager/TransactionLog';
import { TransactionLock } from '../transaction-manager/TransactionLock';
import { TransactionMonitor } from '../transaction-manager/TransactionMonitor';

describe('TransactionManager', () => {
  let manager: TransactionManager;

  beforeEach(() => {
    manager = new TransactionManager({ maxRetries: 5 });
  });

  afterEach(() => {
    manager.reset();
  });

  test('should begin a new transaction', () => {
    const txnId = manager.begin();
    expect(txnId).toBeDefined();
    expect(typeof txnId).toBe('string');
    expect(manager.getStatus(txnId)).toBe('active');
  });

  test('should commit a transaction', () => {
    const txnId = manager.begin();
    const result = manager.commit(txnId);
    expect(result).toBe(true);
    expect(manager.getStatus(txnId)).toBe('committed');
  });

  test('should rollback a transaction', () => {
    const txnId = manager.begin();
    const result = manager.rollback(txnId);
    expect(result).toBe(true);
    expect(manager.getStatus(txnId)).toBe('rolled_back');
  });

  test('should get transaction stats', () => {
    manager.begin();
    manager.begin();
    manager.commit();
    const stats = manager.getStats();
    expect(stats.total).toBe(2);
    expect(stats.committed).toBe(1);
  });

  test('should throw error when committing without transaction', () => {
    expect(() => manager.commit()).toThrow('No active transaction');
  });

  test('should throw error when rollback without transaction', () => {
    expect(() => manager.rollback()).toThrow('No active transaction');
  });

  test('should get snapshot with metrics', () => {
    manager.begin();
    const snapshot = manager.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('transactions');
    expect(snapshot.metrics).toHaveProperty('stats');
  });

  test('should export metrics with version', () => {
    const metrics = manager.exportMetrics();
    expect(metrics.version).toBe('v96');
    expect(metrics).toHaveProperty('stats');
  });

  test('should generate report string', () => {
    manager.begin();
    const report = manager.getReport();
    expect(report).toContain('Transaction Manager Report');
    expect(report).toContain('Total Transactions:');
  });

  test('should reset all transactions', () => {
    manager.begin();
    manager.begin();
    manager.reset();
    const stats = manager.getStats();
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
  });
});

describe('TransactionLog', () => {
  let log: TransactionLog;

  beforeEach(() => {
    log = new TransactionLog({ maxEntries: 100 });
  });

  afterEach(() => {
    log.reset();
  });

  test('should log an entry', () => {
    const id = log.log('Test message', 'INFO', 'txn_1');
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  test('should retrieve a log entry', () => {
    const id = log.log('Test message', 'INFO', 'txn_1');
    const entry = log.retrieve(id);
    expect(entry).toBeDefined();
    expect(entry?.message).toBe('Test message');
  });

  test('should clear logs for a transaction', () => {
    log.log('Test 1', 'INFO', 'txn_1');
    log.log('Test 2', 'INFO', 'txn_1');
    log.clear('txn_1');
    const history = log.getHistory('txn_1');
    expect(history).toHaveLength(0);
  });

  test('should get transaction history', () => {
    log.log('Op 1', 'INFO', 'txn_1');
    log.log('Op 2', 'ERROR', 'txn_1');
    const history = log.getHistory('txn_1');
    expect(history).toHaveLength(2);
  });

  test('should get size of logs', () => {
    log.log('Test 1', 'INFO', 'txn_1');
    log.log('Test 2', 'WARN', 'txn_2');
    const size = log.getSize();
    expect(size.entries).toBe(2);
    expect(size.transactions).toBe(2);
  });

  test('should get entries by level', () => {
    log.log('Info message', 'INFO');
    log.log('Error message', 'ERROR');
    const errors = log.getEntriesByLevel('ERROR');
    expect(errors).toHaveLength(1);
  });

  test('should get snapshot with metrics', () => {
    log.log('Test', 'INFO');
    const snapshot = log.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.entries).toBe(1);
  });

  test('should export metrics with version', () => {
    const metrics = log.exportMetrics();
    expect(metrics.version).toBe('v96');
  });

  test('should generate report', () => {
    log.log('Test', 'INFO');
    const report = log.getReport();
    expect(report).toContain('Transaction Log Report');
  });

  test('should reset all entries', () => {
    log.log('Test 1', 'INFO');
    log.log('Test 2', 'INFO');
    log.reset();
    const size = log.getSize();
    expect(size.entries).toBe(0);
  });
});

describe('TransactionLock', () => {
  let lock: TransactionLock;

  beforeEach(() => {
    lock = new TransactionLock({ maxLocks: 10 });
  });

  afterEach(() => {
    lock.reset();
  });

  test('should acquire a lock', () => {
    const result = lock.acquire('resource_1', 'txn_1');
    expect(result).toBe(true);
    expect(lock.isLocked('resource_1')).toBe(true);
  });

  test('should release a lock', () => {
    lock.acquire('resource_1', 'txn_1');
    const result = lock.release('resource_1', 'txn_1');
    expect(result).toBe(true);
    expect(lock.isLocked('resource_1')).toBe(false);
  });

  test('should get all locks for transaction', () => {
    lock.acquire('resource_1', 'txn_1');
    lock.acquire('resource_2', 'txn_1');
    const locks = lock.getLocks('txn_1');
    expect(locks).toHaveLength(2);
  });

  test('should check if resource is locked by transaction', () => {
    lock.acquire('resource_1', 'txn_1');
    expect(lock.isLocked('resource_1', 'txn_1')).toBe(true);
    expect(lock.isLocked('resource_1', 'txn_2')).toBe(false);
  });

  test('should get lock info', () => {
    lock.acquire('resource_1', 'txn_1');
    const info = lock.getLockInfo('resource_1');
    expect(info).toBeDefined();
    expect(info?.transactionId).toBe('txn_1');
  });

  test('should force release a lock', () => {
    lock.acquire('resource_1', 'txn_1');
    const result = lock.forceRelease('resource_1');
    expect(result).toBe(true);
    expect(lock.isLocked('resource_1')).toBe(false);
  });

  test('should get snapshot with metrics', () => {
    lock.acquire('resource_1', 'txn_1');
    const snapshot = lock.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.locks).toHaveLength(1);
  });

  test('should export metrics with version', () => {
    const metrics = lock.exportMetrics();
    expect(metrics.version).toBe('v96');
    expect(metrics).toHaveProperty('activeLocks');
  });

  test('should generate report', () => {
    lock.acquire('resource_1', 'txn_1');
    const report = lock.getReport();
    expect(report).toContain('Transaction Lock Report');
    expect(report).toContain('Active Locks: 1');
  });

  test('should reset all locks', () => {
    lock.acquire('resource_1', 'txn_1');
    lock.acquire('resource_2', 'txn_1');
    lock.reset();
    const locks = lock.getLocks();
    expect(locks).toHaveLength(0);
  });
});

describe('TransactionMonitor', () => {
  let monitor: TransactionMonitor;

  beforeEach(() => {
    monitor = new TransactionMonitor({ maxTrackedTransactions: 100 });
  });

  afterEach(() => {
    monitor.reset();
  });

  test('should track a transaction', () => {
    const tx = monitor.track('txn_1', 'active');
    expect(tx).toBeDefined();
    expect(tx.id).toBe('txn_1');
    expect(tx.status).toBe('active');
  });

  test('should record metrics for transaction', () => {
    monitor.track('txn_1', 'active');
    monitor.recordMetric('txn_1', 'duration', 100);
    const metrics = monitor.getMetrics('txn_1');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('duration');
  });

  test('should add checkpoint to transaction', () => {
    monitor.track('txn_1', 'active');
    monitor.addCheckpoint('txn_1', 'checkpoint_1', { data: 'test' });
    const tx = monitor.getHistory('txn_1');
    expect(tx?.checkpoints.has('checkpoint_1')).toBe(true);
  });

  test('should get metrics for transaction', () => {
    monitor.recordMetric('txn_1', 'metric_1', 50);
    const metrics = monitor.getMetrics('txn_1');
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('should get history for transaction', () => {
    monitor.track('txn_1', 'active');
    const history = monitor.getHistory('txn_1');
    expect(history).toBeDefined();
    expect(history?.id).toBe('txn_1');
  });

  test('should get status of transaction', () => {
    monitor.track('txn_1', 'active');
    const status = monitor.getStatus('txn_1');
    expect(status).toBe('active');
  });

  test('should complete transaction successfully', () => {
    monitor.track('txn_1', 'active');
    monitor.completeTransaction('txn_1', true);
    const status = monitor.getStatus('txn_1');
    expect(status).toBe('completed');
  });

  test('should complete transaction as failed', () => {
    monitor.track('txn_1', 'active');
    monitor.completeTransaction('txn_1', false);
    const status = monitor.getStatus('txn_1');
    expect(status).toBe('failed');
  });

  test('should get snapshot with metrics', () => {
    monitor.track('txn_1', 'active');
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.trackedTransactions).toBe(1);
  });

  test('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('v96');
  });

  test('should generate report', () => {
    monitor.track('txn_1', 'active');
    const report = monitor.getReport();
    expect(report).toContain('Transaction Monitor Report');
  });

  test('should reset tracked transactions', () => {
    monitor.track('txn_1', 'active');
    monitor.track('txn_2', 'active');
    monitor.reset();
    const status = monitor.getStatus() as Map<string, string>;
    expect(status.size).toBe(0);
  });
});