import { describe, it, expect } from 'vitest';
import { ConfigManager, Plugin, Extension, HookManager } from '../iter26';

describe('iter26 modules', () => {
  describe('ConfigManager', () => {
    it('should set and get', () => {
      const cm = new ConfigManager();
      cm.set('key1', 'value1');
      expect(cm.get('key1')).toBe('value1');
    });
    it('should check has', () => {
      const cm = new ConfigManager();
      cm.set('k', 'v');
      expect(cm.has('k')).toBe(true);
      expect(cm.has('missing')).toBe(false);
    });
    it('should delete', () => {
      const cm = new ConfigManager();
      cm.set('d', 'x');
      cm.delete('d');
      expect(cm.has('d')).toBe(false);
    });
    it('should list keys', () => {
      const cm = new ConfigManager();
      cm.set('a', '1');
      cm.set('b', '2');
      expect(cm.keys()).toContain('a');
    });
    it('should get snapshot', () => {
      const cm = new ConfigManager();
      expect(cm.getSnapshot().keys).toBe(0);
    });
    it('should reset', () => {
      const cm = new ConfigManager();
      cm.set('x', 'y');
      cm.reset();
      expect(cm.getSnapshot().keys).toBe(0);
    });
    it('should get report', () => {
      const cm = new ConfigManager();
      expect(typeof cm.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const cm = new ConfigManager();
      expect(cm.exportMetrics()).toBeDefined();
    });
  });

  describe('Plugin', () => {
    it('should enable and disable', () => {
      const p = new Plugin('p1');
      p.enable();
      expect(p.isEnabled()).toBe(true);
      p.disable();
      expect(p.isEnabled()).toBe(false);
    });
    it('should have name', () => {
      const p = new Plugin('my-plugin');
      expect(p.name).toBe('my-plugin');
    });
    it('should get snapshot', () => {
      const p = new Plugin('snap');
      expect(p.getSnapshot().name).toBe('snap');
    });
    it('should reset', () => {
      const p = new Plugin('res');
      p.enable();
      p.reset();
      expect(p.isEnabled()).toBe(false);
    });
    it('should get report', () => {
      const p = new Plugin('rep');
      expect(typeof p.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const p = new Plugin('met');
      expect(p.exportMetrics()).toBeDefined();
    });
  });

  describe('Extension', () => {
    it('should load and unload', () => {
      const e = new Extension('e1');
      e.load();
      expect(e.isLoaded()).toBe(true);
      e.unload();
      expect(e.isLoaded()).toBe(false);
    });
    it('should have id', () => {
      const e = new Extension('ext-id');
      expect(e.id).toBe('ext-id');
    });
    it('should get snapshot', () => {
      const e = new Extension('snap');
      expect(e.getSnapshot().id).toBe('snap');
    });
    it('should reset', () => {
      const e = new Extension('res');
      e.load();
      e.reset();
      expect(e.isLoaded()).toBe(false);
    });
    it('should get report', () => {
      const e = new Extension('rep');
      expect(typeof e.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const e = new Extension('met');
      expect(e.exportMetrics()).toBeDefined();
    });
  });

  describe('HookManager', () => {
    it('should register and trigger', () => {
      const hm = new HookManager();
      let count = 0;
      hm.register('event1', () => count++);
      hm.trigger('event1');
      expect(count).toBe(1);
    });
    it('should unregister', () => {
      const hm = new HookManager();
      const fn = () => {};
      hm.register('e2', fn);
      hm.unregister('e2', fn);
      expect(hm.getHookCount('e2')).toBe(0);
    });
    it('should count hooks', () => {
      const hm = new HookManager();
      hm.register('e3', () => {});
      hm.register('e3', () => {});
      expect(hm.getHookCount('e3')).toBe(2);
    });
    it('should get snapshot', () => {
      const hm = new HookManager();
      expect(hm.getSnapshot().hooks).toBe(0);
    });
    it('should reset', () => {
      const hm = new HookManager();
      hm.register('x', () => {});
      hm.reset();
      expect(hm.getSnapshot().hooks).toBe(0);
    });
    it('should get report', () => {
      const hm = new HookManager();
      expect(typeof hm.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const hm = new HookManager();
      expect(hm.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const cm = new ConfigManager();
    expect(typeof cm.set).toBe('function');
    expect(typeof cm.get).toBe('function');
    expect(typeof cm.has).toBe('function');
    expect(typeof cm.delete).toBe('function');
    expect(typeof cm.keys).toBe('function');
    expect(typeof cm.getSnapshot).toBe('function');
    expect(typeof cm.reset).toBe('function');
    expect(typeof cm.getReport).toBe('function');
    expect(typeof cm.exportMetrics).toBe('function');
  });
});
