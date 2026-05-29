/**
 * session-manager.test.ts
 * V75 Session Manager - Comprehensive test suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../session-manager/SessionManager';
import { SessionStorage } from '../session-manager/SessionStorage';
import { SessionAuth } from '../session-manager/SessionAuth';
import { SessionEvents } from '../session-manager/SessionEvents';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('should create a session with id', () => {
    const session = manager.create('user1');
    expect(session.id).toBeDefined();
    expect(session.id.startsWith('sess_')).toBe(true);
  });

  it('should create multiple sessions', () => {
    manager.create('user1');
    manager.create('user2');
    expect(manager.getActive().length).toBe(2);
  });

  it('should destroy a session', () => {
    const session = manager.create('user1');
    expect(manager.destroy(session.id)).toBe(true);
    expect(manager.getActive().length).toBe(0);
  });

  it('should return false when destroying non-existent session', () => {
    expect(manager.destroy('invalid')).toBe(false);
  });

  it('should get active session by id', () => {
    const session = manager.create('user1');
    const found = manager.getActiveSession(session.id);
    expect(found?.id).toBe(session.id);
  });

  it('should track session history', () => {
    const session = manager.create('user1');
    manager.destroy(session.id);
    expect(manager.getHistory().length).toBe(1);
  });

  it('should emit events on session create/destroy', () => {
    const createdHandler = vi.fn();
    const destroyedHandler = vi.fn();
    manager.on('session:created', createdHandler);
    manager.on('session:destroyed', destroyedHandler);
    
    const session = manager.create('user1');
    manager.destroy(session.id);
    
    expect(createdHandler).toHaveBeenCalledTimes(1);
    expect(destroyedHandler).toHaveBeenCalledTimes(1);
  });

  it('should get snapshot with metrics', () => {
    manager.create('user1');
    const snapshot = manager.getSnapshot();
    expect(snapshot.metrics.created).toBe(1);
    expect(snapshot.activeCount).toBe(1);
  });

  it('should reset all state', () => {
    manager.create('user1');
    manager.reset();
    expect(manager.getActive().length).toBe(0);
    expect(manager.getHistory().length).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = manager.exportMetrics();
    expect(exported.version).toBe('V75-1.0.0');
    expect(exported.metrics).toBeDefined();
  });

  it('should generate a readable report', () => {
    const report = manager.getReport();
    expect(report).toContain('Session Manager Report');
  });
});

describe('SessionStorage', () => {
  let storage: SessionStorage;

  beforeEach(() => {
    storage = new SessionStorage();
  });

  it('should store and retrieve data', () => {
    storage.setItem('key1', { data: 'value' });
    const retrieved = storage.retrieve('key1');
    expect(retrieved).toEqual({ data: 'value' });
  });

  it('should return null for non-existent key', () => {
    const retrieved = storage.retrieve('nonexistent');
    expect(retrieved).toBeNull();
  });

  it('should delete stored data', () => {
    storage.setItem('key1', { data: 'value' });
    expect(storage.delete('key1')).toBe(true);
    expect(storage.retrieve('key1')).toBeNull();
  });

  it('should clear all stored data', () => {
    storage.setItem('key1', { data: 'value' });
    storage.setItem('key2', { data: 'value2' });
    storage.clear();
    expect(storage.keys().length).toBe(0);
  });

  it('should check if key exists', () => {
    storage.setItem('key1', { data: 'value' });
    expect(storage.has('key1')).toBe(true);
    expect(storage.has('key2')).toBe(false);
  });

  it('should list all keys', () => {
    storage.setItem('key1', { data: '1' });
    storage.setItem('key2', { data: '2' });
    expect(storage.keys()).toContain('key1');
    expect(storage.keys()).toContain('key2');
  });

  it('should emit storage events', () => {
    const handler = vi.fn();
    storage.on('storage:stored', handler);
    storage.setItem('key1', { data: 'value' });
    expect(handler).toHaveBeenCalledWith('key1', { data: 'value' });
  });

  it('should get snapshot with metrics', () => {
    storage.setItem('key1', { data: 'value' });
    const snapshot = storage.getSnapshot();
    expect(snapshot.metrics.stores).toBe(1);
    expect(snapshot.size).toBe(1);
  });

  it('should reset storage state', () => {
    storage.setItem('key1', { data: 'value' });
    storage.reset();
    expect(storage.retrieve('key1')).toBeNull();
  });

  it('should export metrics with version', () => {
    const exported = storage.exportMetrics();
    expect(exported.version).toBe('V75-1.0.0');
  });
});

describe('SessionAuth', () => {
  let auth: SessionAuth;

  beforeEach(() => {
    auth = new SessionAuth();
    auth.registerUser('testuser', 'test@example.com', ['user']);
  });

  it('should login with valid credentials', () => {
    const session = auth.login('testuser', 'password123');
    expect(session).toBeDefined();
    expect(session?.token).toBeDefined();
    expect(session?.isValid).toBe(true);
  });

  it('should fail login with wrong password', () => {
    const session = auth.login('testuser', 'wrong');
    expect(session).toBeNull();
  });

  it('should fail login for non-existent user', () => {
    const session = auth.login('nonexistent', 'password');
    expect(session).toBeNull();
  });

  it('should logout and invalidate session', () => {
    const session = auth.login('testuser', 'password123');
    expect(auth.logout(session!.token)).toBe(true);
    expect(auth.check(session!.token)).toBe(false);
  });

  it('should check token validity', () => {
    const session = auth.login('testuser', 'password123');
    expect(auth.check(session!.token)).toBe(true);
  });

  it('should get user from token', () => {
    const session = auth.login('testuser', 'password123');
    const user = auth.getUser(session!.token);
    expect(user?.username).toBe('testuser');
  });

  it('should refresh token', () => {
    const session = auth.login('testuser', 'password123');
    const newToken = auth.refreshToken(session!.token);
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(session!.token);
  });

  it('should get snapshot with metrics', () => {
    auth.login('testuser', 'password123');
    const snapshot = auth.getSnapshot();
    expect(snapshot.metrics.successfulLogins).toBe(1);
    expect(snapshot.activeSessions).toBe(1);
  });

  it('should reset auth state', () => {
    auth.login('testuser', 'password123');
    auth.reset();
    const snapshot = auth.getSnapshot();
    expect(snapshot.metrics.successfulLogins).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = auth.exportMetrics();
    expect(exported.version).toBe('V75-1.0.0');
  });
});

describe('SessionEvents', () => {
  let events: SessionEvents;

  beforeEach(() => {
    events = new SessionEvents();
  });

  it('should add and call listener', () => {
    const handler = vi.fn();
    events.on('testEvent', handler);
    events.emit('testEvent', 'arg1', 'arg2');
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should support once listener', () => {
    const handler = vi.fn();
    events.once('onceEvent', handler);
    events.emit('onceEvent');
    events.emit('onceEvent');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove listener', () => {
    const handler = vi.fn();
    events.on('removeEvent', handler);
    events.off('removeEvent', handler);
    events.emit('removeEvent');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should get listeners for event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    events.on('getEvent', handler1);
    events.on('getEvent', handler2);
    const listeners = events.getListeners('getEvent');
    expect(listeners.length).toBe(2);
  });

  it('should remove all listeners', () => {
    events.on('event1', vi.fn());
    events.on('event2', vi.fn());
    events.removeAllListeners();
    expect(events.listenerCount('event1')).toBe(0);
    expect(events.listenerCount('event2')).toBe(0);
  });

  it('should track event history', () => {
    events.emit('historyEvent', 'data');
    const history = events.getEventHistory('historyEvent');
    expect(history.length).toBe(1);
    expect(history[0].name).toBe('historyEvent');
  });

  it('should support wildcard listeners', () => {
    const wildcard = vi.fn();
    events.on('*', wildcard);
    events.emit('anyEvent', 'data');
    expect(wildcard).toHaveBeenCalledWith('anyEvent', 'data');
  });

  it('should count listeners', () => {
    events.on('countEvent', vi.fn());
    events.on('countEvent', vi.fn());
    expect(events.listenerCount('countEvent')).toBe(2);
  });

  it('should get snapshot with metrics', () => {
    events.on('snapshotEvent', vi.fn());
    events.emit('snapshotEvent');
    const snapshot = events.getSnapshot();
    expect(snapshot.metrics.emits).toBe(1);
    expect(snapshot.eventTypes).toBe(1);
  });

  it('should reset events state', () => {
    events.on('resetEvent', vi.fn());
    events.emit('resetEvent');
    events.reset();
    const snapshot = events.getSnapshot();
    expect(snapshot.metrics.emits).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = events.exportMetrics();
    expect(exported.version).toBe('V75-1.0.0');
  });
});