/**
 * DocumentLifecycleHooks Tests - V20 Hook Lifecycle Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookRegistry } from '../hooks/HookRegistry';
import { DocumentLifecycleHooks, DocumentHookData } from '../hooks/DocumentLifecycleHooks';

describe('DocumentLifecycleHooks', () => {
  let registry: HookRegistry;
  let hooks: DocumentLifecycleHooks;

  beforeEach(() => {
    registry = new HookRegistry();
    hooks = new DocumentLifecycleHooks(registry);
  });

  describe('constructor', () => {
    it('should create instance with default registry', () => {
      const h = new DocumentLifecycleHooks();
      expect(h).toBeDefined();
    });

    it('should accept custom registry', () => {
      const h = new DocumentLifecycleHooks(registry);
      expect(h).toBeDefined();
    });
  });

  describe('onCreate', () => {
    it('should fire document:create event', async () => {
      const handler = vi.fn();
      registry.register('document:create', 'test', handler);

      const data: DocumentHookData = {
        documentId: 'doc1',
        title: 'Test Doc',
        timestamp: Date.now(),
      };
      hooks.onCreate(data);

      await Promise.resolve(); // Let async handlers complete
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should work without data fields', async () => {
      const handler = vi.fn();
      registry.register('document:create', 'test', handler);

      hooks.onCreate({ documentId: 'doc1', timestamp: Date.now() });

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onOpen', () => {
    it('should fire document:open event', async () => {
      const handler = vi.fn();
      registry.register('document:open', 'test', handler);

      const data: DocumentHookData = {
        documentId: 'doc1',
        timestamp: Date.now(),
        userId: 'user1',
      };
      hooks.onOpen(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('onClose', () => {
    it('should fire document:close event', async () => {
      const handler = vi.fn();
      registry.register('document:close', 'test', handler);

      hooks.onClose({ documentId: 'doc1', timestamp: Date.now() });

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onSave', () => {
    it('should fire document:save event', async () => {
      const handler = vi.fn();
      registry.register('document:save', 'test', handler);

      const data: DocumentHookData = {
        documentId: 'doc1',
        content: 'Some content',
        timestamp: Date.now(),
      };
      hooks.onSave(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('onDelete', () => {
    it('should fire document:delete event', async () => {
      const handler = vi.fn();
      registry.register('document:delete', 'test', handler);

      hooks.onDelete({ documentId: 'doc1', timestamp: Date.now() });

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onRename', () => {
    it('should fire document:rename event with oldTitle', async () => {
      const handler = vi.fn();
      registry.register('document:rename', 'test', handler);

      const data = {
        documentId: 'doc1',
        oldTitle: 'Old Name',
        title: 'New Name',
        timestamp: Date.now(),
      };
      hooks.onRename(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('onUpdate', () => {
    it('should fire document:update event', async () => {
      const handler = vi.fn();
      registry.register('document:update', 'test', handler);

      const data: DocumentHookData = {
        documentId: 'doc1',
        content: 'Updated content',
        timestamp: Date.now(),
      };
      hooks.onUpdate(data);

      await Promise.resolve();
      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('register', () => {
    it('should register a handler for specific event', () => {
      const handler = vi.fn();
      const id = hooks.register('document:create', 'test-handler', handler);

      expect(id).toBeDefined();
      expect(registry.getHookCount('document:create')).toBe(1);
    });

    it('should accept priority parameter', () => {
      const handler = vi.fn();
      hooks.register('document:create', 'high-priority', handler, 'high');
      hooks.register('document:create', 'low-priority', handler, 'low');

      expect(registry.getHookCount('document:create')).toBe(2);
    });

    it('should use normal priority by default', () => {
      const handler = vi.fn();
      const id = hooks.register('document:create', 'test', handler);

      expect(registry.getHookCount('document:create')).toBe(1);
    });
  });

  describe('hasHandlers', () => {
    it('should return true when event has handlers', () => {
      const handler = vi.fn();
      hooks.register('document:create', 'test', handler);

      expect(hooks.hasHandlers('document:create')).toBe(true);
    });

    it('should return false when event has no handlers', () => {
      expect(hooks.hasHandlers('document:create')).toBe(false);
    });
  });
});

describe('DocumentLifecycleHooks - Event Data Types', () => {
  let registry: HookRegistry;
  let hooks: DocumentLifecycleHooks;

  beforeEach(() => {
    registry = new HookRegistry();
    hooks = new DocumentLifecycleHooks(registry);
  });

  it('should pass full document data through hook', async () => {
    const handler = vi.fn();
    registry.register('document:create', 'test', handler);

    const fullData: DocumentHookData = {
      documentId: 'doc1',
      title: 'My Document',
      content: 'Document content here',
      timestamp: Date.now(),
      userId: 'user123',
    };

    hooks.onCreate(fullData);

    await Promise.resolve();
    expect(handler).toHaveBeenCalledWith(fullData);
  });

  it('should handle timestamp in hook data', async () => {
    const handler = vi.fn();
    registry.register('document:create', 'test', handler);

    const timestamp = Date.now();
    hooks.onCreate({ documentId: 'doc1', timestamp });

    await Promise.resolve();
    expect(handler).toHaveBeenCalled();
    const calledData = handler.mock.calls[0][0];
    expect(calledData.timestamp).toBe(timestamp);
  });
});