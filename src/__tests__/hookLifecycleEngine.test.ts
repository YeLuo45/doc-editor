/**
 * HookLifecycleEngine Tests
 * Testing all 17 hooks registration, triggering, and chain execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookLifecycleEngine } from '../hooks/HookLifecycleEngine';
import { HookContext } from '../hooks/HookContext';
import { HookType, TrustLevel } from '../hooks/types';

describe('HookLifecycleEngine', () => {
  let engine: HookLifecycleEngine;

  beforeEach(() => {
    engine = new HookLifecycleEngine();
    engine.clearHistory();
    engine.getRegistry().clearAll();
  });

  describe('Hook Registration', () => {
    it('should register a hook', () => {
      const fn = vi.fn();
      const result = engine.register({
        id: 'test-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.USER,
        priority: 50,
        once: false,
      });
      expect(result).toBe(true);
    });

    it('should register all 17 hook types', () => {
      Object.values(HookType).forEach(type => {
        const fn = vi.fn();
        const result = engine.register({
          id: `hook-${type}`,
          type,
          fn,
          trustLevel: TrustLevel.USER,
          priority: 50,
          once: false,
        });
        expect(result).toBe(true);
      });
      expect(engine.getStats().total).toBe(17);
    });

    it('should reject registration from guest trust level', () => {
      const fn = vi.fn();
      const result = engine.register({
        id: 'guest-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.GUEST,
        priority: 50,
        once: false,
      });
      expect(result).toBe(false);
    });
  });

  describe('Convenience Registration Methods', () => {
    it('should register beforeCreate hook', () => {
      const fn = vi.fn();
      expect(engine.beforeCreate('bc1', fn)).toBe(true);
    });

    it('should register afterCreate hook', () => {
      const fn = vi.fn();
      expect(engine.afterCreate('ac1', fn)).toBe(true);
    });

    it('should register beforeUpdate hook', () => {
      const fn = vi.fn();
      expect(engine.beforeUpdate('bu1', fn)).toBe(true);
    });

    it('should register afterUpdate hook', () => {
      const fn = vi.fn();
      expect(engine.afterUpdate('au1', fn)).toBe(true);
    });

    it('should register beforeDelete hook', () => {
      const fn = vi.fn();
      expect(engine.beforeDelete('bd1', fn)).toBe(true);
    });

    it('should register afterDelete hook', () => {
      const fn = vi.fn();
      expect(engine.afterDelete('ad1', fn)).toBe(true);
    });

    it('should register beforeRender hook', () => {
      const fn = vi.fn();
      expect(engine.beforeRender('br1', fn)).toBe(true);
    });

    it('should register afterRender hook', () => {
      const fn = vi.fn();
      expect(engine.afterRender('ar1', fn)).toBe(true);
    });

    it('should register beforeSave hook', () => {
      const fn = vi.fn();
      expect(engine.beforeSave('bs1', fn)).toBe(true);
    });

    it('should register afterSave hook', () => {
      const fn = vi.fn();
      expect(engine.afterSave('as1', fn)).toBe(true);
    });

    it('should register beforeLoad hook', () => {
      const fn = vi.fn();
      expect(engine.beforeLoad('bl1', fn)).toBe(true);
    });

    it('should register afterLoad hook', () => {
      const fn = vi.fn();
      expect(engine.afterLoad('al1', fn)).toBe(true);
    });

    it('should register beforeConnect hook', () => {
      const fn = vi.fn();
      expect(engine.beforeConnect('bcn1', fn)).toBe(true);
    });

    it('should register afterConnect hook', () => {
      const fn = vi.fn();
      expect(engine.afterConnect('acn1', fn)).toBe(true);
    });

    it('should register beforeDisconnect hook', () => {
      const fn = vi.fn();
      expect(engine.beforeDisconnect('bd1', fn)).toBe(true);
    });

    it('should register afterDisconnect hook', () => {
      const fn = vi.fn();
      expect(engine.afterDisconnect('ad1', fn)).toBe(true);
    });

    it('should register onError hook', () => {
      const fn = vi.fn();
      expect(engine.onError('oe1', fn)).toBe(true);
    });
  });

  describe('Trigger Execution', () => {
    it('should trigger beforeCreate hooks', async () => {
      const fn = vi.fn();
      engine.beforeCreate('bc1', fn);
      const context = HookContext.forBefore(HookType.BEFORE_CREATE, { data: 'test' });
      const result = await engine.trigger(HookType.BEFORE_CREATE, context);
      expect(fn).toHaveBeenCalledWith(context);
      expect(result.success).toBe(true);
      expect(result.hooksExecuted).toBe(1);
    });

    it('should trigger afterCreate hooks', async () => {
      const fn = vi.fn();
      engine.afterCreate('ac1', fn);
      const context = HookContext.forAfter(HookType.AFTER_CREATE, { data: 'test' });
      const result = await engine.trigger(HookType.AFTER_CREATE, context);
      expect(fn).toHaveBeenCalledWith(context);
      expect(result.success).toBe(true);
    });

    it('should execute all hooks of same type', async () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      engine.beforeCreate('bc1', fn1, TrustLevel.USER, 100);
      engine.beforeCreate('bc2', fn2, TrustLevel.USER, 50);
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      expect(fn1).toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('should respect priority ordering', async () => {
      const callOrder: string[] = [];
      engine.beforeCreate('bc1', () => callOrder.push('first'), TrustLevel.USER, 10);
      engine.beforeCreate('bc2', () => callOrder.push('second'), TrustLevel.USER, 100);
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      expect(callOrder).toEqual(['second', 'first']);
    });
  });

  describe('Chain Execution', () => {
    it('should execute before and after hooks for create', async () => {
      const beforeFn = vi.fn();
      const afterFn = vi.fn();
      engine.beforeCreate('bc1', beforeFn);
      engine.afterCreate('ac1', afterFn);
      const result = await engine.triggerCreate({ data: 'test' });
      expect(beforeFn).toHaveBeenCalled();
      expect(afterFn).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should stop chain on preventDefault', async () => {
      const beforeFn = vi.fn().mockImplementation((ctx: HookContext) => {
        ctx.doPreventDefault();
      });
      const afterFn = vi.fn();
      engine.beforeCreate('bc1', beforeFn);
      engine.afterCreate('ac1', afterFn);
      await engine.triggerCreate({ data: 'test' });
      expect(beforeFn).toHaveBeenCalled();
      expect(afterFn).not.toHaveBeenCalled();
    });
  });

  describe('Once Execution', () => {
    it('should only execute once hook once', async () => {
      const fn = vi.fn();
      engine.register({
        id: 'once-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.USER,
        priority: 50,
        once: true,
      });
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should trigger onError hook when hook throws', async () => {
      const errorFn = vi.fn();
      const badFn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      engine.onError('err1', errorFn);
      engine.beforeCreate('bc1', badFn);
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      expect(errorFn).toHaveBeenCalled();
    });

    it('should call triggerError', async () => {
      const fn = vi.fn();
      engine.onError('oe1', fn);
      const result = await engine.triggerError(new Error('Test'));
      expect(fn).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Hook Management', () => {
    it('should unregister a hook', () => {
      const fn = vi.fn();
      engine.beforeCreate('bc1', fn, TrustLevel.DEVELOPER);
      expect(engine.unregister('bc1')).toBe(true);
      expect(engine.getRegistry().count(HookType.BEFORE_CREATE)).toBe(0);
    });

    it('should enable a hook', () => {
      const fn = vi.fn();
      engine.register({
        id: 'disabled-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.USER,
        priority: 50,
        once: false,
        enabled: false,
      });
      expect(engine.enable('disabled-hook')).toBe(true);
      expect(engine.getRegistry().has(HookType.BEFORE_CREATE, 'disabled-hook')).toBe(true);
    });

    it('should disable a hook', () => {
      const fn = vi.fn();
      engine.register({
        id: 'enabled-hook',
        type: HookType.BEFORE_CREATE,
        fn,
        trustLevel: TrustLevel.USER,
        priority: 50,
        once: false,
        enabled: true,
      });
      expect(engine.disable('enabled-hook')).toBe(true);
    });
  });

  describe('History Tracking', () => {
    it('should record execution history', async () => {
      engine.beforeCreate('bc1', vi.fn());
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      const history = engine.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe(HookType.BEFORE_CREATE);
    });

    it('should clear history', async () => {
      engine.beforeCreate('bc1', vi.fn());
      const context = HookContext.forBefore(HookType.BEFORE_CREATE);
      await engine.trigger(HookType.BEFORE_CREATE, context);
      engine.clearHistory();
      expect(engine.getHistory()).toEqual([]);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', () => {
      engine.beforeCreate('bc1', vi.fn());
      engine.afterUpdate('au1', vi.fn());
      const stats = engine.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType[HookType.BEFORE_CREATE]).toBe(1);
      expect(stats.byType[HookType.AFTER_UPDATE]).toBe(1);
    });

    it('should track hooks by trust level', () => {
      engine.register({
        id: 'sys-hook',
        type: HookType.BEFORE_CREATE,
        fn: vi.fn(),
        trustLevel: TrustLevel.SYSTEM,
        priority: 50,
        once: false,
      });
      const stats = engine.getStats();
      expect(stats.byTrustLevel[TrustLevel.SYSTEM]).toBe(1);
    });
  });
});