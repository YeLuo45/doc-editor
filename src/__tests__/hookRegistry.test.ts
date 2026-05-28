/**
 * HookRegistry Tests
 * Testing priority sorting, once execution, and condition filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookRegistry } from '../hooks/HookRegistry';
import { TrustHierarchy } from '../hooks/TrustHierarchy';
import { HookContext } from '../hooks/HookContext';
import { HookType, TrustLevel } from '../hooks/types';

describe('HookRegistry', () => {
  let registry: HookRegistry;
  let trustHierarchy: TrustHierarchy;

  beforeEach(() => {
    trustHierarchy = new TrustHierarchy();
    registry = new HookRegistry(trustHierarchy);
  });

  describe('Registration', () => {
    it('should register a hook', () => {
      const fn = vi.fn();
      const result = registry.register({
        id: 'test-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.USER,
        priority: 50,
        once: false,
      });
      expect(result).toBe(true);
      expect(registry.count(HookType.BEFORE_CREATE)).toBe(1);
    });

    it('should reject registration without modify permission', () => {
      const fn = vi.fn();
      const result = registry.register({
        id: 'guest-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.GUEST,
        priority: 50,
        once: false,
      });
      expect(result).toBe(false);
    });

    it('should clamp priority to max allowed', () => {
      const fn = vi.fn();
      registry.register({
        id: 'high-priority-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.USER,
        priority: 1000,
        once: false,
      });
      const hooks = registry.getHooks(HookType.BEFORE_CREATE);
      expect(hooks[0].priority).toBeLessThanOrEqual(100);
    });
  });

  describe('Priority Sorting', () => {
    it('should sort hooks by priority descending', () => {
      registry.register({ id: 'low', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 10, once: false });
      registry.register({ id: 'high', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 100, once: false });
      registry.register({ id: 'mid', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      const hooks = registry.getHooks(HookType.BEFORE_CREATE);
      expect(hooks[0].id).toBe('high');
      expect(hooks[1].id).toBe('mid');
      expect(hooks[2].id).toBe('low');
    });

    it('should execute higher priority hooks first', async () => {
      const order: string[] = [];
      registry.register({ id: 'low', type: HookType.BEFORE_CREATE, fn: () => order.push('low'), trustLevel: TrustLevel.USER, priority: 10, once: false });
      registry.register({ id: 'high', type: HookType.BEFORE_CREATE, fn: () => order.push('high'), trustLevel: TrustLevel.USER, priority: 100, once: false });
      const hooks = registry.getHooksFiltered(HookType.BEFORE_CREATE, HookContext.forBefore(HookType.BEFORE_CREATE));
      for (const hook of hooks) {
        await hook.fn(HookContext.forBefore(HookType.BEFORE_CREATE));
      }
      expect(order).toEqual(['high', 'low']);
    });
  });

  describe('Once Execution', () => {
    it('should mark hook as executed after once execution', async () => {
      const fn = vi.fn();
      registry.register({ id: 'once', type: HookType.BEFORE_CREATE, fn, trustLevel: TrustLevel.USER, priority: 50, once: true });
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await registry.getHooksFiltered(HookType.BEFORE_CREATE, context);
      registry.markExecuted(HookType.BEFORE_CREATE, 'once');
      expect(registry.getHooks(HookType.BEFORE_CREATE)[0].executed).toBe(true);
    });

    it('should filter out executed once hooks', () => {
      registry.register({ id: 'once', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: true });
      registry.markExecuted(HookType.BEFORE_CREATE, 'once');
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      const filtered = registry.getHooksFiltered(HookType.BEFORE_CREATE, context);
      expect(filtered.length).toBe(0);
    });

    it('should reset executed state for all hooks', () => {
      registry.register({ id: 'once', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: true });
      registry.markExecuted(HookType.BEFORE_CREATE, 'once');
      registry.resetExecuted();
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      const filtered = registry.getHooksFiltered(HookType.BEFORE_CREATE, context);
      expect(filtered.length).toBe(1);
    });
  });

  describe('Condition Filtering', () => {
    it('should filter hooks by enabled state', () => {
      registry.register({ id: 'enabled-hook', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      const context = HookContext.forBefore(HookType.BEFORE_CREATE, {});
      const filtered = registry.getHooksFiltered(HookType.BEFORE_CREATE, context);
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Hook Management', () => {
    it('should unregister a hook', () => {
      registry.register({ id: 'test', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.DEVELOPER, priority: 50, once: false });
      expect(registry.unregister('test')).toBe(true);
      expect(registry.count(HookType.BEFORE_CREATE)).toBe(0);
    });

    it('should not unregister without delete permission', () => {
      registry.register({ id: 'guest-hook', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.GUEST, priority: 50, once: false });
      expect(registry.unregister('guest-hook')).toBe(false);
    });

    it('should enable and disable hooks', () => {
      registry.register({ id: 'test', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false, enabled: false });
      expect(registry.enable('test')).toBe(true);
      expect(registry.getHooks(HookType.BEFORE_CREATE)[0].enabled).toBe(true);
      expect(registry.disable('test')).toBe(true);
      expect(registry.getHooks(HookType.BEFORE_CREATE)[0].enabled).toBe(false);
    });

    it('should clear hooks for a type', () => {
      registry.register({ id: 'test1', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      registry.register({ id: 'test2', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      registry.clear(HookType.BEFORE_CREATE);
      expect(registry.count(HookType.BEFORE_CREATE)).toBe(0);
    });

    it('should clear all hooks', () => {
      registry.register({ id: 'test1', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      registry.register({ id: 'test2', type: HookType.AFTER_UPDATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      registry.clearAll();
      expect(registry.totalCount()).toBe(0);
    });
  });

  describe('Query Methods', () => {
    it('should check if hook exists', () => {
      registry.register({ id: 'test', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      expect(registry.has(HookType.BEFORE_CREATE, 'test')).toBe(true);
      expect(registry.has(HookType.BEFORE_CREATE, 'nonexistent')).toBe(false);
    });

    it('should get hooks by trust level', () => {
      registry.register({ id: 'user-hook', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      registry.register({ id: 'sys-hook', type: HookType.AFTER_UPDATE, fn: vi.fn(), trustLevel: TrustLevel.SYSTEM, priority: 50, once: false });
      const userHooks = registry.getByTrustLevel(TrustLevel.USER);
      expect(userHooks.length).toBe(1);
      expect(userHooks[0].entry.id).toBe('user-hook');
    });

    it('should return correct counts', () => {
      registry.register({ id: 'test1', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      registry.register({ id: 'test2', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      expect(registry.count(HookType.BEFORE_CREATE)).toBe(2);
      expect(registry.count(HookType.AFTER_UPDATE)).toBe(0);
      expect(registry.totalCount()).toBe(2);
    });

    it('should get all hooks as map', () => {
      registry.register({ id: 'test', type: HookType.BEFORE_CREATE, fn: vi.fn(), trustLevel: TrustLevel.USER, priority: 50, once: false });
      const allHooks = registry.getAllHooks();
      expect(allHooks.get(HookType.BEFORE_CREATE)?.length).toBe(1);
    });
  });
});