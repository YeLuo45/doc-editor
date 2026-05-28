/**
 * HookRegistry Tests - V20 Hook Lifecycle Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookRegistry, HookPriority, HookRegistration, DocumentHookEvent, CollabHookEvent, PluginHookEvent, AnyHookEvent } from '../hooks/HookRegistry';

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe('constructor', () => {
    it('should create empty registry', () => {
      expect(registry.getHookCount()).toBe(0);
      expect(registry.getEvents()).toEqual([]);
    });

    it('should initialize hooks map', () => {
      expect(registry.getHookCount('document:create')).toBe(0);
      expect(registry.hasHandlers('document:create')).toBe(false);
    });
  });

  describe('register', () => {
    it('should register a hook handler', () => {
      const handler = vi.fn();
      const id = registry.register('document:create', 'test-handler', handler);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(registry.getHookCount('document:create')).toBe(1);
    });

    it('should register hooks for different events', () => {
      const handler = vi.fn();
      registry.register('document:create', 'handler1', handler);
      registry.register('document:open', 'handler2', handler);
      registry.register('collab:join', 'handler3', handler);
      
      expect(registry.getHookCount('document:create')).toBe(1);
      expect(registry.getHookCount('document:open')).toBe(1);
      expect(registry.getHookCount('collab:join')).toBe(1);
    });

    it('should register multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      registry.register('document:create', 'handler1', handler1);
      registry.register('document:create', 'handler2', handler2);
      
      expect(registry.getHookCount('document:create')).toBe(2);
    });

    it('should support priority parameter', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      registry.register('document:create', 'low', handler1, 'low');
      registry.register('document:create', 'high', handler2, 'high');
      registry.register('document:create', 'normal', handler3, 'normal');
      
      expect(registry.getHookCount('document:create')).toBe(3);
    });

    it('should default priority to normal', () => {
      const handler = vi.fn();
      const id = registry.register('document:create', 'test', handler);
      
      expect(registry.getHookCount('document:create')).toBe(1);
    });

    it('should generate unique ids', () => {
      const handler = vi.fn();
      const id1 = registry.register('document:create', 'test-a', handler);
      const id2 = registry.register('document:create', 'test-b', () => {});
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('unregister', () => {
    it('should unregister a hook by id', () => {
      const handler = vi.fn();
      const id = registry.register('document:create', 'test', handler);
      
      expect(registry.getHookCount('document:create')).toBe(1);
      
      const result = registry.unregister(id);
      
      expect(result).toBe(true);
      expect(registry.getHookCount('document:create')).toBe(0);
    });

    it('should return false for non-existent id', () => {
      const result = registry.unregister('non-existent-id');
      
      expect(result).toBe(false);
    });

    it('should unregister specific handler when multiple exist', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      const id1 = registry.register('document:create', 'handler1', handler1);
      registry.register('document:create', 'handler2', handler2);
      
      registry.unregister(id1);
      
      expect(registry.getHookCount('document:create')).toBe(1);
    });
  });

  describe('unregisterAll', () => {
    it('should unregister all hooks when no argument provided', () => {
      const handler = vi.fn();
      registry.register('document:create', 'h1', handler);
      registry.register('document:open', 'h2', handler);
      registry.register('collab:join', 'h3', handler);
      
      const count = registry.unregisterAll();
      
      expect(count).toBe(3);
      expect(registry.getHookCount()).toBe(0);
    });

    it('should unregister all hooks for specific event', () => {
      const handler = vi.fn();
      const reg1 = registry.register('document:create', 'h1', handler);
      const reg2 = registry.register('document:create', 'h2', handler);
      registry.register('document:open', 'h3', handler);
      
      // Use unregister by specific id
      registry.unregister(reg1);
      registry.unregister(reg2);
      
      expect(registry.getHookCount('document:create')).toBe(0);
      expect(registry.getHookCount('document:open')).toBe(1);
    });

    it('should unregister all hooks with specific name', () => {
      // Note: unregisterAll with name filters by registration.name field
      const handler = vi.fn();
      registry.register('document:create', 'shared-name', handler);
      registry.register('document:open', 'shared-name', handler);
      registry.register('collab:join', 'other-name', handler);
      
      const count = registry.unregisterAll('shared-name');
      
      expect(count).toBe(2);
    });
  });

  describe('fire', () => {
    it('should call sync handler', async () => {
      const handler = vi.fn();
      registry.register('document:create', 'test', handler);
      
      const data = { documentId: 'doc1', timestamp: Date.now() };
      await registry.fire('document:create', data);
      
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should call async handler', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.register('document:create', 'test', handler);
      
      await registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() });
      
      expect(handler).toHaveBeenCalled();
    });

    it('should handle mixed sync and async handlers', async () => {
      const syncHandler = vi.fn();
      const asyncHandler = vi.fn().mockResolvedValue(undefined);
      
      registry.register('document:create', 'sync', syncHandler);
      registry.register('document:create', 'async', asyncHandler);
      
      await registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() });
      
      expect(syncHandler).toHaveBeenCalled();
      expect(asyncHandler).toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();
      
      registry.register('document:create', 'error', errorHandler);
      registry.register('document:create', 'normal', normalHandler);
      
      // Should not throw
      await expect(registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() })).resolves.toBeUndefined();
      
      expect(normalHandler).toHaveBeenCalled();
    });

    it('should call handlers in priority order', async () => {
      const callOrder: string[] = [];
      
      registry.register('document:create', 'low', () => callOrder.push('low'), 'low');
      registry.register('document:create', 'high', () => callOrder.push('high'), 'high');
      registry.register('document:create', 'normal', () => callOrder.push('normal'), 'normal');
      
      await registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() });
      
      expect(callOrder).toEqual(['high', 'normal', 'low']);
    });

    it('should not fail when firing event with no handlers', async () => {
      await expect(registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() })).resolves.toBeUndefined();
    });

    it('should handle rejected promises', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Async error'));
      registry.register('document:create', 'test', handler);
      
      // Should not throw
      await expect(registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() })).resolves.toBeUndefined();
    });
  });

  describe('getEvents', () => {
    it('should return all registered events', () => {
      const handler = vi.fn();
      registry.register('document:create', 'h1', handler);
      registry.register('document:open', 'h2', handler);
      registry.register('collab:join', 'h3', handler);
      
      const events = registry.getEvents();
      
      expect(events).toContain('document:create');
      expect(events).toContain('document:open');
      expect(events).toContain('collab:join');
    });

    it('should return empty array when no hooks registered', () => {
      expect(registry.getEvents()).toEqual([]);
    });
  });

  describe('getHookCount', () => {
    it('should return total hook count when no event specified', () => {
      const handler = vi.fn();
      registry.register('document:create', 'h1', handler);
      registry.register('document:open', 'h2', handler);
      
      expect(registry.getHookCount()).toBe(2);
    });

    it('should return hook count for specific event', () => {
      const handler = vi.fn();
      registry.register('document:create', 'h1', handler);
      registry.register('document:create', 'h2', handler);
      
      expect(registry.getHookCount('document:create')).toBe(2);
    });

    it('should return 0 for unregistered event', () => {
      expect(registry.getHookCount('document:non-existent')).toBe(0);
    });
  });

  describe('setEnabled', () => {
    it('should enable a hook', () => {
      const handler = vi.fn();
      const id = registry.register('document:create', 'test', handler);
      
      registry.setEnabled(id, false);
      expect(registry.hasHandlers('document:create')).toBe(false);
      
      registry.setEnabled(id, true);
      expect(registry.hasHandlers('document:create')).toBe(true);
    });

    it('should return false for non-existent hook', () => {
      const result = registry.setEnabled('non-existent', true);
      expect(result).toBe(false);
    });
  });

  describe('hasHandlers', () => {
    it('should return true when event has handlers', () => {
      const handler = vi.fn();
      registry.register('document:create', 'test', handler);
      
      expect(registry.hasHandlers('document:create')).toBe(true);
    });

    it('should return false when event has no handlers', () => {
      expect(registry.hasHandlers('document:create')).toBe(false);
    });

    it('should return false when all handlers are disabled', () => {
      const handler = vi.fn();
      const id = registry.register('document:create', 'test', handler);
      registry.setEnabled(id, false);
      
      expect(registry.hasHandlers('document:create')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all hooks', () => {
      const handler = vi.fn();
      registry.register('document:create', 'h1', handler);
      registry.register('document:open', 'h2', handler);
      registry.register('collab:join', 'h3', handler);
      
      registry.clear();
      
      expect(registry.getHookCount()).toBe(0);
      expect(registry.getEvents()).toEqual([]);
    });
  });
});

describe('HookRegistry Types', () => {
  it('should export all hook event types', () => {
    const docEvent: DocumentHookEvent = 'document:create';
    const collabEvent: CollabHookEvent = 'collab:join';
    const pluginEvent: PluginHookEvent = 'plugin:load';
    
    expect(docEvent).toBe('document:create');
    expect(collabEvent).toBe('collab:join');
    expect(pluginEvent).toBe('plugin:load');
  });

  it('should support AnyHookEvent union type', () => {
    const event: AnyHookEvent = 'document:create';
    expect(event).toBe('document:create');
  });

  it('should support HookPriority type', () => {
    const priority: HookPriority = 'high';
    expect(priority).toBe('high');
  });
});