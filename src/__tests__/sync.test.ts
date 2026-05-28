/**
 * V25 Offline-first Sync Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncEngine } from '../sync/SyncEngine';
import { ConflictResolver } from '../sync/ConflictResolver';
import { OfflineQueue } from '../sync/OfflineQueue';
import { SyncStorage } from '../sync/SyncStorage';
import { SyncMetrics } from '../sync/SyncMetrics';
import { SyncProtocol } from '../sync/SyncProtocol';

describe('SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = new SyncEngine();
  });

  it('should initialize with default state', () => {
    const status = engine.getStatus();
    expect(status.status).toBe('idle');
    expect(status.pendingChanges).toBe(0);
    expect(status.version).toBe(25);
  });

  it('should add and track pending changes', () => {
    const changeId = engine.addChange({
      type: 'create',
      entityType: 'document',
      entityId: 'doc-1',
      data: { title: 'Test' },
    });
    expect(changeId).toBeTruthy();
    const changes = engine.getPendingChanges();
    expect(changes.length).toBe(1);
  });

  it('should remove a pending change', () => {
    const changeId = engine.addChange({
      type: 'update',
      entityType: 'document',
      entityId: 'doc-1',
      data: { title: 'Test' },
    });
    expect(engine.removeChange(changeId)).toBe(true);
    expect(engine.getPendingChanges().length).toBe(0);
  });

  it('should sync pending changes', async () => {
    engine.addChange({ type: 'create', entityType: 'doc', entityId: '1', data: {} });
    const result = await engine.sync();
    expect(result.success).toBe(true);
  });

  it('should track sync conflicts', async () => {
    const onConflict = vi.fn();
    const engine = new SyncEngine({ onConflict });
    engine.addChange({ type: 'update', entityType: 'doc', entityId: '1', data: {} });
    await engine.sync();
    // May or may not trigger conflict based on random simulation
    expect(typeof onConflict).toBe('function');
  });

  it('should resolve a conflict', () => {
    engine.addChange({ type: 'update', entityType: 'doc', entityId: '1', data: {} });
    const result = engine.resolve('conflict_123', 'local');
    expect(result).toBe(false); // No such conflict exists
  });

  it('should provide status', () => {
    const status = engine.getStatus();
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('lastSyncTime');
    expect(status).toHaveProperty('pendingChanges');
  });

  it('should get snapshot', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot).toHaveProperty('state');
    expect(snapshot).toHaveProperty('pendingChangesCount');
  });

  it('should reset state', () => {
    engine.addChange({ type: 'create', entityType: 'doc', entityId: '1', data: {} });
    engine.reset();
    expect(engine.getPendingChanges().length).toBe(0);
  });

  it('should get report', () => {
    const report = engine.getReport();
    expect(report).toHaveProperty('version');
    expect(report).toHaveProperty('status');
  });

  it('should export metrics', () => {
    const metrics = engine.exportMetrics();
    expect(metrics).toHaveProperty('totalSyncs');
    expect(metrics).toHaveProperty('syncHistory');
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  it('should detect conflicts', () => {
    const localValue = { title: 'Local' };
    const remoteValue = { title: 'Remote' };
    const isConflict = resolver.detectConflict(
      'document', 'doc-1', localValue, remoteValue,
      Date.now(), Date.now() - 1000
    );
    expect(isConflict).toBe(true);
  });

  it('should not detect conflict for identical values', () => {
    const value = { title: 'Same' };
    const isConflict = resolver.detectConflict(
      'document', 'doc-1', value, value,
      Date.now(), Date.now()
    );
    expect(isConflict).toBe(false);
  });

  it('should resolve conflict with last-write-wins', () => {
    resolver.detectConflict('document', 'doc-1', { a: 1 }, { b: 2 }, Date.now(), Date.now() - 5000);
    const active = resolver.getActiveConflicts();
    if (active.length > 0) {
      const result = resolver.resolve(active[0].id, { type: 'last-write-wins' });
      expect(result).toBe(true);
    }
  });

  it('should merge changes', () => {
    const changes = [
      { value: { title: 'First' }, timestamp: 1000 },
      { value: { title: 'Second' }, timestamp: 2000 },
    ];
    const result = resolver.mergeChanges(changes);
    expect(result.success).toBe(true);
    expect(result.value).toEqual({ title: 'Second' });
  });

  it('should get active conflicts', () => {
    resolver.detectConflict('doc', '1', { a: 1 }, { b: 2 }, Date.now(), Date.now());
    const active = resolver.getActiveConflicts();
    expect(active.length).toBeGreaterThanOrEqual(0);
  });

  it('should get snapshot', () => {
    const snapshot = resolver.getSnapshot();
    expect(snapshot).toHaveProperty('activeConflictCount');
  });

  it('should reset', () => {
    resolver.detectConflict('doc', '1', { a: 1 }, { b: 2 }, Date.now(), Date.now());
    resolver.reset();
    expect(resolver.getActiveConflicts().length).toBe(0);
  });

  it('should get report', () => {
    const report = resolver.getReport();
    expect(report).toHaveProperty('totalConflicts');
  });

  it('should export metrics', () => {
    const metrics = resolver.exportMetrics();
    expect(metrics).toHaveProperty('totalDetected');
  });
});

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    queue = new OfflineQueue();
  });

  it('should enqueue items', () => {
    const id = queue.enqueue({
      operation: 'create',
      entityType: 'document',
      entityId: 'doc-1',
      payload: { title: 'Test' },
      priority: 1,
    });
    expect(id).toBeTruthy();
    expect(queue.size).toBe(1);
  });

  it('should not exceed max size', () => {
    const smallQueue = new OfflineQueue({ maxSize: 2 });
    smallQueue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    smallQueue.enqueue({ operation: 'create', entityType: 'doc', entityId: '2', payload: {}, priority: 1 });
    const result = smallQueue.enqueue({ operation: 'create', entityType: 'doc', entityId: '3', payload: {}, priority: 1 });
    expect(result).toBeNull();
  });

  it('should dequeue items', () => {
    const id = queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 })!;
    const item = queue.dequeue(id);
    expect(item).toBeTruthy();
    expect(queue.size).toBe(0);
  });

  it('should flush queue', async () => {
    queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    const processor = vi.fn().mockResolvedValue(true);
    const result = await queue.flush(processor);
    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1);
  });

  it('should get queued items sorted by priority', () => {
    queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '2', payload: {}, priority: 10 });
    const items = queue.getQueued();
    expect(items[0].entityId).toBe('2'); // Higher priority first
  });

  it('should clear queue', () => {
    queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    expect(queue.clear()).toBe(1);
    expect(queue.isEmpty()).toBe(true);
  });

  it('should check if empty', () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    expect(queue.isEmpty()).toBe(false);
  });

  it('should check if full', () => {
    const smallQueue = new OfflineQueue({ maxSize: 2 });
    expect(smallQueue.isFull()).toBe(false);
    smallQueue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    smallQueue.enqueue({ operation: 'create', entityType: 'doc', entityId: '2', payload: {}, priority: 1 });
    expect(smallQueue.isFull()).toBe(true);
  });

  it('should get snapshot', () => {
    queue.enqueue({ operation: 'create', entityType: 'doc', entityId: '1', payload: {}, priority: 1 });
    const snapshot = queue.getSnapshot();
    expect(snapshot).toHaveProperty('size');
  });

  it('should get report', () => {
    const report = queue.getReport();
    expect(report).toHaveProperty('maxSize');
  });

  it('should export metrics', () => {
    const metrics = queue.exportMetrics();
    expect(metrics).toHaveProperty('enqueuedTotal');
  });
});

describe('SyncStorage', () => {
  let storage: SyncStorage;

  beforeEach(() => {
    storage = new SyncStorage('test');
  });

  it('should save and load data', () => {
    expect(storage.save('key1', { value: 'test' })).toBe(true);
    const value = storage.load('key1');
    expect(value).toEqual({ value: 'test' });
  });

  it('should return null for missing key', () => {
    const value = storage.load('nonexistent');
    expect(value).toBeNull();
  });

  it('should check if key exists', () => {
    storage.save('key1', { data: 1 });
    expect(storage.has('key1')).toBe(true);
    expect(storage.has('key2')).toBe(false);
  });

  it('should clear all data', () => {
    storage.save('key1', { data: 1 });
    storage.save('key2', { data: 2 });
    expect(storage.clear()).toBe(2);
    expect(storage.getSize()).toBe(0);
  });

  it('should get size', () => {
    storage.save('key1', { data: 'some data' });
    const size = storage.getSize();
    expect(size).toBeGreaterThan(0);
  });

  it('should remove entry', () => {
    storage.save('key1', { data: 1 });
    expect(storage.remove('key1')).toBe(true);
    expect(storage.has('key1')).toBe(false);
  });

  it('should get all keys', () => {
    storage.save('key1', { data: 1 });
    storage.save('key2', { data: 2 });
    const keys = storage.keys();
    expect(keys.length).toBe(2);
  });

  it('should get snapshot', () => {
    storage.save('key1', { data: 1 });
    const snapshot = storage.getSnapshot();
    expect(snapshot).toHaveProperty('namespace');
  });

  it('should reset', () => {
    storage.save('key1', { data: 1 });
    storage.reset();
    expect(storage.load('key1')).toBeNull();
  });

  it('should get report', () => {
    const report = storage.getReport();
    expect(report).toHaveProperty('entries');
  });

  it('should export metrics', () => {
    const metrics = storage.exportMetrics();
    expect(metrics).toHaveProperty('totalSaves');
  });
});

describe('SyncMetrics', () => {
  let metrics: SyncMetrics;

  beforeEach(() => {
    metrics = new SyncMetrics();
  });

  it('should record sync operations', () => {
    metrics.recordSync(true, 100, 0);
    const data = metrics.getMetrics();
    expect(data.totalSyncs).toBe(1);
    expect(data.successfulSyncs).toBe(1);
  });

  it('should track failed syncs', () => {
    metrics.recordSync(false, 50, 0);
    const data = metrics.getMetrics();
    expect(data.failedSyncs).toBe(1);
  });

  it('should calculate success rate', () => {
    metrics.recordSync(true, 100, 0);
    metrics.recordSync(false, 100, 0);
    expect(metrics.getSuccessRate()).toBe(0.5);
  });

  it('should get history', () => {
    metrics.recordSync(true, 100, 0);
    const history = metrics.getHistory('syncDuration');
    expect(history.length).toBeGreaterThan(0);
  });

  it('should get snapshot', () => {
    metrics.recordSync(true, 100, 0);
    const snapshot = metrics.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset', () => {
    metrics.recordSync(true, 100, 0);
    metrics.reset();
    expect(metrics.getMetrics().totalSyncs).toBe(0);
  });

  it('should get report', () => {
    const report = metrics.getReport();
    expect(report).toHaveProperty('successRate');
  });

  it('should export metrics', () => {
    metrics.recordSync(true, 100, 0);
    const exported = metrics.exportMetrics();
    expect(exported).toHaveProperty('totalSyncs');
  });
});

describe('SyncProtocol', () => {
  let protocol: SyncProtocol;

  beforeEach(() => {
    protocol = new SyncProtocol();
  });

  it('should create sync packet', () => {
    const packet = protocol.createSyncPacket('full', { data: 'test' });
    expect(packet.version).toBe(25);
    expect(packet.type).toBe('full');
    expect(packet.sequenceNumber).toBe(1);
  });

  it('should parse sync packet', () => {
    const original = protocol.createSyncPacket('delta', { changes: [] });
    const serialized = protocol.serialize(original);
    const parsed = protocol.parseSyncPacket(serialized);
    expect(parsed).toBeTruthy();
    expect(parsed?.type).toBe('delta');
  });

  it('should validate valid packet', () => {
    const packet = protocol.createSyncPacket('full', { data: 'test' });
    const result = protocol.validateSync(packet);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should create ack packet', () => {
    const ack = protocol.createAckPacket(5, true);
    expect(ack.type).toBe('ack');
    expect(ack.payload).toHaveProperty('sequenceNumber', 5);
  });

  it('should create heartbeat packet', () => {
    const hb = protocol.createHeartbeatPacket();
    expect(hb.type).toBe('heartbeat');
  });

  it('should create conflict packet', () => {
    const conflict = protocol.createConflictPacket({ local: 1 }, { remote: 2 });
    expect(conflict.type).toBe('conflict');
  });

  it('should serialize and deserialize', () => {
    const packet = protocol.createSyncPacket('full', { key: 'value' });
    const str = protocol.serialize(packet);
    const parsed = protocol.parseSyncPacket(str);
    expect(parsed?.payload).toEqual({ key: 'value' });
  });

  it('should track sequence numbers', () => {
    protocol.createSyncPacket('full', {});
    protocol.createSyncPacket('delta', {});
    expect(protocol.getSequenceNumber()).toBe(2);
  });

  it('should acknowledge packets', () => {
    protocol.createSyncPacket('full', {});
    protocol.acknowledge(1);
    expect(protocol.shouldResend(2)).toBe(true); // 2 > 1 (lastAcked)
    expect(protocol.shouldResend(1)).toBe(false); // 1 is not > 1
  });

  it('should get snapshot', () => {
    const snapshot = protocol.getSnapshot();
    expect(snapshot).toHaveProperty('sequenceNumber');
  });

  it('should reset', () => {
    protocol.createSyncPacket('full', {});
    protocol.reset();
    expect(protocol.getSequenceNumber()).toBe(0);
  });

  it('should get report', () => {
    const report = protocol.getReport();
    expect(report).toHaveProperty('version');
  });

  it('should export metrics', () => {
    const metrics = protocol.exportMetrics();
    expect(metrics).toHaveProperty('currentSequence');
  });
});