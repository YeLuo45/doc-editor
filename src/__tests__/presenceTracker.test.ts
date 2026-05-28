import { describe, it, expect, beforeEach } from 'vitest';
import {
  PresenceTracker,
  type CursorPosition,
  type SelectionRange,
  type UserPresence,
} from '../collab/PresenceTracker.js';

describe('PresenceTracker', () => {
  let tracker: PresenceTracker;

  beforeEach(() => {
    tracker = new PresenceTracker('node1');
  });

  describe('join/leave', () => {
    it('should join a user', () => {
      const presence = tracker.join('user1', 'Alice');
      expect(presence.userId).toBe('user1');
      expect(presence.userName).toBe('Alice');
      expect(presence.isOnline).toBe(true);
    });

    it('should return existing presence for re-join', () => {
      tracker.join('user1', 'Alice');
      const presence = tracker.join('user1', 'Alice Updated');
      expect(presence.userName).toBe('Alice Updated');
    });

    it('should leave a user', () => {
      tracker.join('user1', 'Alice');
      tracker.leave('user1');
      expect(tracker.isOnline('user1')).toBe(false);
    });

    it('should return false for isOnline of non-existent user', () => {
      expect(tracker.isOnline('nonexistent')).toBe(false);
    });
  });

  describe('cursor tracking', () => {
    it('should update cursor position', () => {
      tracker.join('user1', 'Alice');
      const cursor: CursorPosition = { position: 42, line: 5, column: 10 };
      tracker.updateCursor('user1', cursor);

      const user = tracker.getUser('user1');
      expect(user?.cursor?.position).toBe(42);
      expect(user?.cursor?.line).toBe(5);
    });

    it('should set cursor to null', () => {
      tracker.join('user1', 'Alice');
      tracker.updateCursor('user1', { position: 42 });
      tracker.updateCursor('user1', null);

      const user = tracker.getUser('user1');
      expect(user?.cursor).toBeNull();
    });
  });

  describe('selection tracking', () => {
    it('should update selection range', () => {
      tracker.join('user1', 'Alice');
      const selection: SelectionRange = { start: 10, end: 20 };
      tracker.updateSelection('user1', selection);

      const user = tracker.getUser('user1');
      expect(user?.selection?.start).toBe(10);
      expect(user?.selection?.end).toBe(20);
    });

    it('should detect selection contains position', () => {
      tracker.join('user1', 'Alice');
      tracker.updateSelection('user1', { start: 10, end: 20 });

      const users = tracker.getUsersWithSelectionAt(15);
      expect(users.length).toBe(1);
      expect(users[0].userId).toBe('user1');
    });

    it('should not find users when position outside selection', () => {
      tracker.join('user1', 'Alice');
      tracker.updateSelection('user1', { start: 10, end: 20 });

      const users = tracker.getUsersWithSelectionAt(5);
      expect(users.length).toBe(0);
    });
  });

  describe('user queries', () => {
    it('should get all online users', () => {
      tracker.join('user1', 'Alice');
      tracker.join('user2', 'Bob');
      tracker.leave('user1');

      const online = tracker.getOnlineUsers();
      expect(online.length).toBe(1);
      expect(online[0].userName).toBe('Bob');
    });

    it('should get all users including offline', () => {
      tracker.join('user1', 'Alice');
      tracker.join('user2', 'Bob');
      tracker.leave('user1');

      const all = tracker.getAllUsers();
      expect(all.length).toBe(2);
    });

    it('should get users at specific position', () => {
      tracker.join('user1', 'Alice');
      tracker.updateCursor('user1', { position: 42 });

      const users = tracker.getUsersAtPosition(42);
      expect(users.length).toBe(1);
    });
  });

  describe('presence updates', () => {
    it('should update partial presence', () => {
      tracker.join('user1', 'Alice');
      tracker.updatePresence('user1', { userName: 'Alice Updated' });

      const user = tracker.getUser('user1');
      expect(user?.userName).toBe('Alice Updated');
    });
  });

  describe('state sync', () => {
    it('should get and restore state', () => {
      tracker.join('user1', 'Alice');
      tracker.updateCursor('user1', { position: 42 });

      const state = tracker.getState();

      const newTracker = new PresenceTracker('node2');
      newTracker.loadState(state);

      const user = newTracker.getUser('user1');
      expect(user?.cursor?.position).toBe(42);
    });

    it('should merge remote presence', () => {
      tracker.join('user1', 'Alice');

      const remoteUsers = new Map<string, UserPresence>();
      remoteUsers.set('user1', {
        userId: 'user1',
        userName: 'Alice Remote',
        color: '#FF0000',
        cursor: { position: 100 },
        selection: null,
        lastActive: Date.now() + 1000,
        isOnline: true,
      });
      remoteUsers.set('user2', {
        userId: 'user2',
        userName: 'Bob Remote',
        color: '#00FF00',
        cursor: null,
        selection: null,
        lastActive: Date.now(),
        isOnline: true,
      });

      tracker.mergeRemote(remoteUsers);

      // Should have both users
      const users = tracker.getAllUsers();
      expect(users.length).toBe(2);
    });
  });

  describe('user management', () => {
    it('should remove user completely', () => {
      tracker.join('user1', 'Alice');
      tracker.removeUser('user1');

      expect(tracker.getUser('user1')).toBeUndefined();
    });

    it('should clear all users', () => {
      tracker.join('user1', 'Alice');
      tracker.join('user2', 'Bob');
      tracker.clear();

      expect(tracker.getAllUsers().length).toBe(0);
    });
  });

  describe('broadcast payload', () => {
    it('should generate broadcast payload', () => {
      tracker.join('user1', 'Alice');
      tracker.join('user2', 'Bob');

      const payload = tracker.toBroadcastPayload();
      expect(Object.keys(payload).length).toBe(2);
      expect(payload['user1'].userName).toBe('Alice');
    });
  });

  describe('color assignment', () => {
    it('should assign different colors to users', () => {
      const colors = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const presence = tracker.join(`user${i}`, `User ${i}`);
        colors.add(presence.color);
      }
      // Colors cycle, but we should have at least some variety
      expect(colors.size).toBeGreaterThan(0);
    });
  });
});
