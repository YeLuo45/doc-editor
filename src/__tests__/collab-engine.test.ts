import { describe, it, expect, beforeEach } from 'vitest';
import { CollaborationHub } from '../collab-engine/CollaborationHub';
import { PresenceManager } from '../collab-engine/PresenceManager';
import { ConflictResolver, Operation } from '../collab-engine/ConflictResolver';
import { SessionManager } from '../collab-engine/SessionManager';

describe('V57 Collaboration Engine', () => {
  describe('CollaborationHub', () => {
    let hub: CollaborationHub;

    beforeEach(() => {
      hub = new CollaborationHub();
    });

    it('should have config property', () => {
      expect(hub.config).toBeDefined();
      expect(typeof hub.config.maxParticipants).toBe('number');
    });

    it('should join participant', () => {
      expect(hub.join('p1', 'Alice')).toBe(true);
      expect(hub.join('p2', 'Bob')).toBe(true);
    });

    it('should not exceed max participants', () => {
      const smallHub = new CollaborationHub({ maxParticipants: 2 });
      expect(smallHub.join('p1', 'A')).toBe(true);
      expect(smallHub.join('p2', 'B')).toBe(true);
      expect(smallHub.join('p3', 'C')).toBe(false);
    });

    it('should leave participant', () => {
      hub.join('p1', 'Alice');
      expect(hub.leave('p1')).toBe(true);
      expect(hub.leave('nonexistent')).toBe(false);
    });

    it('should broadcast to participants', () => {
      hub.join('p1', 'Alice');
      hub.join('p2', 'Bob');
      const recipients = hub.broadcast('hello', 'p1');
      expect(recipients).toContain('p2');
      expect(recipients).not.toContain('p1');
    });

    it('should get participants', () => {
      hub.join('p1', 'Alice');
      hub.join('p2', 'Bob');
      const participants = hub.getParticipants();
      expect(participants.length).toBe(2);
    });

    it('should get snapshot with metrics', () => {
      hub.join('p1', 'Alice');
      const snap = hub.getSnapshot();
      expect(snap.metrics).toBeDefined();
      expect(snap.metrics.totalJoins).toBe(1);
      expect(snap.metrics.activeParticipants).toBe(1);
    });

    it('should reset state', () => {
      hub.join('p1', 'Alice');
      hub.reset();
      expect(hub.getParticipants().length).toBe(0);
    });

    it('should get report string', () => {
      expect(typeof hub.getReport()).toBe('string');
      expect(hub.getReport()).toContain('CollaborationHub');
    });

    it('should export metrics with version', () => {
      const metrics = hub.exportMetrics();
      expect(metrics.version).toBeDefined();
      expect(metrics.version).toContain('V57');
    });
  });

  describe('PresenceManager', () => {
    let presence: PresenceManager;

    beforeEach(() => {
      presence = new PresenceManager();
    });

    it('should have config property', () => {
      expect(presence.config).toBeDefined();
      expect(typeof presence.config.heartbeatInterval).toBe('number');
    });

    it('should join user', () => {
      expect(presence.join('u1', 'Alice')).toBe(true);
      expect(presence.join('u2', 'Bob')).toBe(true);
    });

    it('should not exceed max entries', () => {
      const small = new PresenceManager({ maxPresenceEntries: 1 });
      expect(small.join('u1', 'A')).toBe(true);
      expect(small.join('u2', 'B')).toBe(false);
    });

    it('should leave user', () => {
      presence.join('u1', 'Alice');
      expect(presence.leave('u1')).toBe(true);
      expect(presence.leave('nonexistent')).toBe(false);
    });

    it('should update presence', () => {
      presence.join('u1', 'Alice');
      expect(presence.update('u1', { status: 'away' })).toBe(true);
      expect(presence.update('nonexistent', { status: 'away' })).toBe(false);
    });

    it('should get presence', () => {
      presence.join('u1', 'Alice');
      const p = presence.getPresence('u1');
      expect(p).toBeDefined();
      expect(p?.name).toBe('Alice');
    });

    it('should get all presences', () => {
      presence.join('u1', 'Alice');
      presence.join('u2', 'Bob');
      expect(presence.getAllPresences().length).toBe(2);
    });

    it('should get snapshot with metrics', () => {
      presence.join('u1', 'Alice');
      const snap = presence.getSnapshot();
      expect(snap.metrics.totalJoins).toBe(1);
    });

    it('should reset state', () => {
      presence.join('u1', 'Alice');
      presence.reset();
      expect(presence.getAllPresences().length).toBe(0);
    });

    it('should get report string', () => {
      expect(typeof presence.getReport()).toBe('string');
      expect(presence.getReport()).toContain('PresenceManager');
    });

    it('should export metrics', () => {
      const m = presence.exportMetrics();
      expect(m.version).toContain('V57');
    });
  });

  describe('ConflictResolver', () => {
    let resolver: ConflictResolver;

    const makeOp = (id: string, type: 'insert' | 'delete' | 'retain', pos: number, userId: string): Operation => ({
      id,
      type,
      position: pos,
      content: type === 'insert' ? 'x' : undefined,
      length: type === 'delete' ? 1 : undefined,
      userId,
      version: 1,
      timestamp: Date.now(),
    });

    beforeEach(() => {
      resolver = new ConflictResolver();
    });

    it('should have config property', () => {
      expect(resolver.config).toBeDefined();
      expect(typeof resolver.config.maxHistorySize).toBe('number');
    });

    it('should transform operations', () => {
      const op1 = makeOp('o1', 'insert', 5, 'u1');
      const op2 = makeOp('o2', 'insert', 3, 'u2');
      const result = resolver.transform(op1, op2);
      expect(result).toBeDefined();
      expect(result.position).toBeGreaterThanOrEqual(op1.position);
    });

    it('should compose operations from same user', () => {
      const op1 = makeOp('o1', 'insert', 0, 'u1');
      op1.content = 'hello';
      const op2 = makeOp('o2', 'insert', 5, 'u1');
      op2.content = 'world';
      const composed = resolver.compose(op1, op2);
      expect(composed).not.toBeNull();
    });

    it('should not compose from different users', () => {
      const op1 = makeOp('o1', 'insert', 0, 'u1');
      const op2 = makeOp('o2', 'insert', 5, 'u2');
      expect(resolver.compose(op1, op2)).toBeNull();
    });

    it('should resolve conflicts', () => {
      const incoming = makeOp('i1', 'insert', 10, 'u1');
      const base = makeOp('b1', 'insert', 5, 'u2');
      const result = resolver.resolve(incoming, base);
      expect(result.operation).toBeDefined();
      expect(result.conflictsResolved).toBe(1);
    });

    it('should add to history', () => {
      const op = makeOp('h1', 'insert', 0, 'u1');
      resolver.addToHistory(op);
      expect(resolver.getHistory().length).toBe(1);
    });

    it('should get snapshot with metrics', () => {
      const op = makeOp('s1', 'insert', 0, 'u1');
      resolver.transform(op, makeOp('s2', 'insert', 5, 'u2'));
      const snap = resolver.getSnapshot();
      expect(snap.metrics.totalTransforms).toBe(1);
    });

    it('should reset state', () => {
      const op = makeOp('r1', 'insert', 0, 'u1');
      resolver.addToHistory(op);
      resolver.reset();
      expect(resolver.getHistory().length).toBe(0);
    });

    it('should get report string', () => {
      expect(typeof resolver.getReport()).toBe('string');
      expect(resolver.getReport()).toContain('ConflictResolver');
    });

    it('should export metrics', () => {
      const m = resolver.exportMetrics();
      expect(m.version).toContain('V57');
    });
  });

  describe('SessionManager', () => {
    let sessions: SessionManager;

    beforeEach(() => {
      sessions = new SessionManager();
    });

    it('should have config property', () => {
      expect(sessions.config).toBeDefined();
      expect(typeof sessions.config.maxSessions).toBe('number');
    });

    it('should create session', () => {
      const s = sessions.create('s1', 'Session 1', 'u1');
      expect(s).not.toBeNull();
      expect(s?.name).toBe('Session 1');
    });

    it('should not duplicate session ids', () => {
      sessions.create('s1', 'S1', 'u1');
      expect(sessions.create('s1', 'S2', 'u2')).toBeNull();
    });

    it('should not exceed max sessions', () => {
      const small = new SessionManager({ maxSessions: 1 });
      expect(small.create('a', 'A', 'u1')).not.toBeNull();
      expect(small.create('b', 'B', 'u2')).toBeNull();
    });

    it('should close session', () => {
      sessions.create('s1', 'S1', 'u1');
      expect(sessions.close('s1')).toBe(true);
      expect(sessions.close('nonexistent')).toBe(false);
    });

    it('should get session', () => {
      sessions.create('s1', 'S1', 'u1');
      const s = sessions.getSession('s1');
      expect(s).toBeDefined();
      expect(s?.id).toBe('s1');
    });

    it('should get active sessions', () => {
      sessions.create('s1', 'S1', 'u1');
      sessions.create('s2', 'S2', 'u2');
      const active = sessions.getActiveSessions();
      expect(active.length).toBe(2);
    });

    it('should add and remove participants', () => {
      sessions.create('s1', 'S1', 'u1');
      expect(sessions.addParticipant('s1', 'u2')).toBe(true);
      expect(sessions.addParticipant('s1', 'u3')).toBe(true);
      expect(sessions.removeParticipant('s1', 'u2')).toBe(true);
    });

    it('should auto-close on empty when configured', () => {
      const auto = new SessionManager({ autoCloseOnEmpty: true });
      auto.create('s1', 'S1', 'u1');
      auto.addParticipant('s1', 'u2');
      auto.removeParticipant('s1', 'u2');
      const s = auto.getSession('s1');
      expect(s?.isActive).toBe(false);
    });

    it('should delete session', () => {
      sessions.create('s1', 'S1', 'u1');
      expect(sessions.deleteSession('s1')).toBe(true);
      expect(sessions.getSession('s1')).toBeUndefined();
    });

    it('should get snapshot with metrics', () => {
      sessions.create('s1', 'S1', 'u1');
      const snap = sessions.getSnapshot();
      expect(snap.metrics.totalCreated).toBe(1);
      expect(snap.metrics.activeSessions).toBe(1);
    });

    it('should reset state', () => {
      sessions.create('s1', 'S1', 'u1');
      sessions.reset();
      expect(sessions.getActiveSessions().length).toBe(0);
    });

    it('should get report string', () => {
      expect(typeof sessions.getReport()).toBe('string');
      expect(sessions.getReport()).toContain('SessionManager');
    });

    it('should export metrics', () => {
      const m = sessions.exportMetrics();
      expect(m.version).toContain('V57');
    });
  });

  it('should have all required methods across all classes', () => {
    const hub = new CollaborationHub();
    const presence = new PresenceManager();
    const resolver = new ConflictResolver();
    const session = new SessionManager();

    // All must have config, getSnapshot, reset, getReport, exportMetrics
    expect(typeof hub.config).toBe('object');
    expect(typeof hub.getSnapshot).toBe('function');
    expect(typeof hub.reset).toBe('function');
    expect(typeof hub.getReport).toBe('function');
    expect(typeof hub.exportMetrics).toBe('function');

    expect(typeof presence.config).toBe('object');
    expect(typeof presence.getSnapshot).toBe('function');
    expect(typeof presence.reset).toBe('function');
    expect(typeof presence.getReport).toBe('function');
    expect(typeof presence.exportMetrics).toBe('function');

    expect(typeof resolver.config).toBe('object');
    expect(typeof resolver.getSnapshot).toBe('function');
    expect(typeof resolver.reset).toBe('function');
    expect(typeof resolver.getReport).toBe('function');
    expect(typeof resolver.exportMetrics).toBe('function');

    expect(typeof session.config).toBe('object');
    expect(typeof session.getSnapshot).toBe('function');
    expect(typeof session.reset).toBe('function');
    expect(typeof session.getReport).toBe('function');
    expect(typeof session.exportMetrics).toBe('function');
  });
});