/**
 * data-sync.test.ts - V90 Data Sync Tests
 * Tests for DataSync, SyncConflictResolver, SyncScheduler, and SyncMonitor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataSync } from '../data-sync/DataSync';
import { SyncConflictResolver } from '../data-sync/SyncConflictResolver';
import { SyncScheduler } from '../data-sync/SyncScheduler';
import { SyncMonitor } from '../data-sync/SyncMonitor';

describe('DataSync', () => {
  let sync: DataSync;

  beforeEach(() => {
    sync = new DataSync({ direction: 'bidirectional', enableMetrics: true });
  });

  it('should create DataSync with default config', () => {
    expect(sync.config.direction).toBe('bidirectional');
    expect(sync.config.interval).toBe(30000);
  });

  it('should get initial status', () => {
    const status = sync.getStatus();
    expect(status.status).toBe('idle');
    expect(status.pendingCount).toBe(0);
  });

  it('should get stats', () => {
    const stats = sync.getStats();
    expect(stats.pushed).toBe(0);
    expect(stats.pulled).toBe(0);
  });

  it('should return snapshot', () => {
    const snapshot = sync.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.status).toBe('idle');
  });

  it('should reset state', () => {
    sync.reset();
    expect(sync.getStatus().status).toBe('idle');
  });

  it('should export metrics version', () => {
    const metrics = sync.exportMetrics();
    expect(metrics.version).toBe('V90');
  });

  it('should get report', () => {
    const report = sync.getReport();
    expect(report).toContain('status');
  });
});

describe('SyncConflictResolver', () => {
  let resolver: SyncConflictResolver;

  beforeEach(() => {
    resolver = new SyncConflictResolver({ autoResolve: false });
  });

  it('should create resolver with default config', () => {
    expect(resolver.config.autoResolve).toBe(false);
    expect(resolver.config.defaultStrategy).toBe('local');
  });

  it('should detect conflict', () => {
    const conflict = resolver.detectConflict(
      'item-1', 'document', 1, 2, { title: 'Local' }, { title: 'Remote' }
    );
    expect(conflict.id).toBeDefined();
    expect(conflict.status).toBe('detected');
  });

  it('should get conflicts', () => {
    resolver.detectConflict('item-1', 'document', 1, 2, {}, {});
    const conflicts = resolver.getConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('should resolve conflict with local strategy', async () => {
    const conflict = resolver.detectConflict('item-1', 'document', 1, 2, { title: 'Local' }, { title: 'Remote' });
    const result = await resolver.resolve(conflict.id, 'local');
    expect(result.success).toBe(true);
    expect(result.resolvedData).toEqual({ title: 'Local' });
  });

  it('should resolve conflict with remote strategy', async () => {
    const conflict = resolver.detectConflict('item-1', 'document', 1, 2, { title: 'Local' }, { title: 'Remote' });
    const result = await resolver.resolve(conflict.id, 'remote');
    expect(result.success).toBe(true);
    expect(result.resolvedData).toEqual({ title: 'Remote' });
  });

  it('should get history', () => {
    resolver.detectConflict('item-1', 'document', 1, 2, {}, {});
    const history = resolver.getHistory();
    expect(history).toBeDefined();
  });

  it('should return snapshot', () => {
    const snapshot = resolver.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.activeConflicts).toBeDefined();
  });

  it('should reset state', () => {
    resolver.reset();
    const snapshot = resolver.getSnapshot();
    expect(snapshot.activeConflicts).toBe(0);
  });

  it('should export metrics version', () => {
    const metrics = resolver.exportMetrics();
    expect(metrics.version).toBe('V90');
  });

  it('should get report', () => {
    const report = resolver.getReport();
    expect(report).toContain('metrics');
  });
});

describe('SyncScheduler', () => {
  let scheduler: SyncScheduler;

  beforeEach(() => {
    scheduler = new SyncScheduler({ direction: 'bidirectional' });
  });

  it('should create scheduler with default config', () => {
    expect(scheduler.config.direction).toBe('bidirectional');
    expect(scheduler.config.retryOnFailure).toBe(true);
  });

  it('should schedule a sync', () => {
    const scheduled = scheduler.schedule('Daily Sync', 'daily');
    expect(scheduled.id).toBeDefined();
    expect(scheduled.frequency).toBe('daily');
    expect(scheduled.status).toBe('pending');
  });

  it('should cancel scheduled sync', () => {
    const scheduled = scheduler.schedule('Test Sync', 'once');
    const cancelled = scheduler.cancel(scheduled.id);
    expect(cancelled).toBe(true);
  });

  it('should get scheduled syncs', () => {
    scheduler.schedule('Sync 1', 'hourly');
    scheduler.schedule('Sync 2', 'daily');
    const scheduled = scheduler.getScheduled();
    expect(scheduled.length).toBe(2);
  });

  it('should execute scheduled sync', async () => {
    const scheduled = scheduler.schedule('Test Sync', 'once', { interval: 100 });
    const result = await scheduler.execute(scheduled.id);
    expect(result.executedAt).toBeGreaterThan(0);
  });

  it('should get history', () => {
    const history = scheduler.getHistory();
    expect(history).toBeDefined();
  });

  it('should return snapshot', () => {
    const snapshot = scheduler.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.activeSchedules).toBeDefined();
  });

  it('should reset state', () => {
    scheduler.reset();
    const snapshot = scheduler.getSnapshot();
    expect(snapshot.activeSchedules).toBe(0);
  });

  it('should export metrics version', () => {
    const metrics = scheduler.exportMetrics();
    expect(metrics.version).toBe('V90');
  });

  it('should get report', () => {
    const report = scheduler.getReport();
    expect(report).toContain('metrics');
  });
});

describe('SyncMonitor', () => {
  let monitor: SyncMonitor;

  beforeEach(() => {
    monitor = new SyncMonitor({ historySize: 50, enableRealTimeEvents: true });
  });

  it('should create monitor with default config', () => {
    expect(monitor.config.historySize).toBe(50);
    expect(monitor.config.enableRealTimeEvents).toBe(true);
  });

  it('should track sync event', () => {
    const event = monitor.track({ type: 'sync', success: true, itemCount: 5 });
    expect(event.id).toBeDefined();
    expect(event.success).toBe(true);
  });

  it('should track push event', () => {
    const event = monitor.track({ type: 'push', success: true, itemCount: 3 });
    expect(event.type).toBe('push');
  });

  it('should track pull event', () => {
    const event = monitor.track({ type: 'pull', success: true, itemCount: 2 });
    expect(event.type).toBe('pull');
  });

  it('should track conflict event', () => {
    const event = monitor.track({ type: 'conflict', success: false });
    expect(event.type).toBe('conflict');
  });

  it('should get metrics', () => {
    monitor.track({ type: 'sync', success: true });
    const metrics = monitor.getMetrics();
    expect(metrics.totalSyncs).toBe(1);
  });

  it('should get history', () => {
    monitor.track({ type: 'sync', success: true });
    monitor.track({ type: 'push', success: true });
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  it('should filter history by type', () => {
    monitor.track({ type: 'sync', success: true });
    monitor.track({ type: 'push', success: true });
    const history = monitor.getHistory({ type: 'sync' });
    expect(history.length).toBe(1);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.status).toBe('active');
    expect(status.eventCount).toBeDefined();
  });

  it('should return snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.status).toBe('active');
  });

  it('should reset state', () => {
    monitor.track({ type: 'sync', success: true });
    monitor.reset();
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalSyncs).toBe(0);
  });

  it('should export metrics version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V90');
  });

  it('should get report', () => {
    const report = monitor.getReport();
    expect(report).toContain('metrics');
  });
});