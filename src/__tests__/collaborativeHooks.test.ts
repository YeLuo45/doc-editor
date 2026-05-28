/**
 * CollaborativeHooks Tests - V20 Hook Lifecycle Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookRegistry } from '../hooks/HookRegistry';
import { CollaborativeHooks, CollabHookData, OperationHookData, SyncHookData, ConflictHookData } from '../hooks/CollaborativeHooks';

describe('CollaborativeHooks', () => {
  let registry: HookRegistry;
  let hooks: CollaborativeHooks;

  beforeEach(() => {
    registry = new HookRegistry();
    hooks = new CollaborativeHooks(registry);
  });

  describe('constructor', () => {
    it('should create instance with default registry', () => {
      const h = new CollaborativeHooks();
      expect(h).toBeDefined();
    });

    it('should accept custom registry', () => {
      const h = new CollaborativeHooks(registry);
      expect(h).toBeDefined();
    });
  });

  describe('onJoin', () => {
    it('should fire collab:join event', async () => {
      const handler = vi.fn();
      registry.register('collab:join', 'test', handler);

      const data: CollabHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
      };
      hooks.onJoin(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should include additional room metadata', async () => {
      const handler = vi.fn();
      registry.register('collab:join', 'test', handler);

      const data: CollabHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        role: 'editor',
      };
      hooks.onJoin(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onLeave', () => {
    it('should fire collab:leave event', async () => {
      const handler = vi.fn();
      registry.register('collab:leave', 'test', handler);

      const data: CollabHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
      };
      hooks.onLeave(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('onOperation', () => {
    it('should fire collab:operation event', async () => {
      const handler = vi.fn();
      registry.register('collab:operation', 'test', handler);

      const data: OperationHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        operation: { type: 'insert', position: 0, content: 'a' },
      };
      hooks.onOperation(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should include transformed flag', async () => {
      const handler = vi.fn();
      registry.register('collab:operation', 'test', handler);

      const data: OperationHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        operation: { type: 'insert', position: 0, content: 'a' },
        transformed: true,
      };
      hooks.onOperation(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].transformed).toBe(true);
    });
  });

  describe('onSync', () => {
    it('should fire collab:sync event', async () => {
      const handler = vi.fn();
      registry.register('collab:sync', 'test', handler);

      const data: SyncHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        direction: 'push',
        syncedVersion: 5,
      };
      hooks.onSync(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should support pull direction', async () => {
      const handler = vi.fn();
      registry.register('collab:sync', 'test', handler);

      const data: SyncHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        direction: 'pull',
        syncedVersion: 10,
      };
      hooks.onSync(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onConflict', () => {
    it('should fire collab:conflict event', async () => {
      const handler = vi.fn();
      registry.register('collab:conflict', 'test', handler);

      const data: ConflictHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        conflictType: 'concurrent-edit',
        resolution: 'merged',
      };
      hooks.onConflict(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should support different resolution types', async () => {
      const handler = vi.fn();
      registry.register('collab:conflict', 'test', handler);

      const data: ConflictHookData = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        conflictType: 'delete',
        resolution: 'local',
      };
      hooks.onConflict(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onPresence', () => {
    it('should fire collab:presence event', async () => {
      const handler = vi.fn();
      registry.register('collab:presence', 'test', handler);

      const data: CollabHookData & { presence: Record<string, unknown> } = {
        roomId: 'room1',
        userId: 'user1',
        timestamp: Date.now(),
        presence: { cursor: { line: 1, column: 5 }, selection: null },
      };
      hooks.onPresence(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('register', () => {
    it('should register a handler for specific event', () => {
      const handler = vi.fn();
      const id = hooks.register('collab:join', 'test-handler', handler);

      expect(id).toBeDefined();
      expect(registry.getHookCount('collab:join')).toBe(1);
    });

    it('should accept priority parameter', () => {
      const handler = vi.fn();
      hooks.register('collab:join', 'high-priority', handler, 'high');
      hooks.register('collab:join', 'low-priority', handler, 'low');

      expect(registry.getHookCount('collab:join')).toBe(2);
    });

    it('should use normal priority by default', () => {
      const handler = vi.fn();
      hooks.register('collab:join', 'test', handler);

      expect(registry.getHookCount('collab:join')).toBe(1);
    });
  });

  describe('hasHandlers', () => {
    it('should return true when event has handlers', () => {
      const handler = vi.fn();
      hooks.register('collab:join', 'test', handler);

      expect(hooks.hasHandlers('collab:join')).toBe(true);
    });

    it('should return false when event has no handlers', () => {
      expect(hooks.hasHandlers('collab:join')).toBe(false);
    });
  });
});

describe('CollaborativeHooks - Data Types', () => {
  let registry: HookRegistry;
  let hooks: CollaborativeHooks;

  beforeEach(() => {
    registry = new HookRegistry();
    hooks = new CollaborativeHooks(registry);
  });

  it('should pass full collab data through hook', async () => {
    const handler = vi.fn();
    registry.register('collab:join', 'test', handler);

    const fullData: CollabHookData = {
      roomId: 'room1',
      userId: 'user1',
      timestamp: Date.now(),
      role: 'admin',
    };

    hooks.onJoin(fullData);

    await Promise.resolve();
    expect(handler).toHaveBeenCalledWith(fullData);
  });

  it('should handle operation data with nested objects', async () => {
    const handler = vi.fn();
    registry.register('collab:operation', 'test', handler);

    const data: OperationHookData = {
      roomId: 'room1',
      userId: 'user1',
      timestamp: Date.now(),
      operation: {
        type: 'replace',
        position: { line: 1, column: 0 },
        length: 10,
        content: 'replacement text',
      },
      transformed: false,
    };

    hooks.onOperation(data);

    await Promise.resolve();
    expect(handler).toHaveBeenCalled();
  });
});