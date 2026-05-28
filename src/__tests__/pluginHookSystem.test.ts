/**
 * PluginHookSystem Tests - V20 Hook Lifecycle Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookRegistry } from '../hooks/HookRegistry';
import { PluginHookSystem, PluginMetadata, PluginLoadPayload, PluginUnloadPayload, PluginErrorPayload } from '../hooks/PluginHookSystem';

describe('PluginHookSystem', () => {
  let registry: HookRegistry;
  let system: PluginHookSystem;

  beforeEach(() => {
    registry = new HookRegistry();
    system = new PluginHookSystem(registry);
  });

  describe('constructor', () => {
    it('should create instance with default registry', () => {
      const s = new PluginHookSystem();
      expect(s).toBeDefined();
    });

    it('should accept custom registry', () => {
      const s = new PluginHookSystem(registry);
      expect(s).toBeDefined();
    });

    it('should start with empty plugins', () => {
      expect(system.getPluginCount()).toBe(0);
      expect(system.hasPlugins()).toBe(false);
    });
  });

  describe('registerPlugin', () => {
    it('should register a plugin', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      const id = system.registerPlugin(metadata);

      expect(id).toBe('test-plugin');
      expect(system.getPluginCount()).toBe(1);
      expect(system.isPluginLoaded('test-plugin')).toBe(true);
    });

    it('should fire plugin:load event', async () => {
      const handler = vi.fn();
      registry.register('plugin:load', 'test', handler);

      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      const payload = handler.mock.calls[0][0] as PluginLoadPayload;
      expect(payload.pluginId).toBe('test-plugin');
      expect(payload.pluginName).toBe('Test Plugin');
      expect(payload.version).toBe('1.0.0');
    });

    it('should throw when registering duplicate plugin', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      expect(() => system.registerPlugin(metadata)).toThrow();
    });

    it('should set loadedAt timestamp', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      const plugin = system.getPlugin('test-plugin');

      expect(plugin?.loadedAt).toBeDefined();
      expect(typeof plugin?.loadedAt).toBe('number');
    });

    it('should support full metadata', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        dependencies: ['dep1', 'dep2'],
      };

      system.registerPlugin(metadata);
      const plugin = system.getPlugin('test-plugin');

      expect(plugin?.metadata.description).toBe('A test plugin');
      expect(plugin?.metadata.author).toBe('Test Author');
      expect(plugin?.metadata.dependencies).toEqual(['dep1', 'dep2']);
    });
  });

  describe('unregisterPlugin', () => {
    it('should unregister a plugin', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      expect(system.getPluginCount()).toBe(1);

      const result = system.unregisterPlugin('test-plugin');

      expect(result).toBe(true);
      expect(system.getPluginCount()).toBe(0);
      expect(system.isPluginLoaded('test-plugin')).toBe(false);
    });

    it('should fire plugin:unload event', async () => {
      const handler = vi.fn();
      registry.register('plugin:unload', 'test', handler);

      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.unregisterPlugin('test-plugin');

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      const payload = handler.mock.calls[0][0] as PluginUnloadPayload;
      expect(payload.pluginId).toBe('test-plugin');
    });

    it('should return false for non-existent plugin', () => {
      const result = system.unregisterPlugin('non-existent');
      expect(result).toBe(false);
    });

    it('should support reason parameter', async () => {
      const handler = vi.fn();
      registry.register('plugin:unload', 'test', handler);

      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.unregisterPlugin('test-plugin', 'reload');

      await Promise.resolve();
      const payload = handler.mock.calls[0][0] as PluginUnloadPayload;
      expect(payload.reason).toBe('reload');
    });

    it('should clean up plugin hooks', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.registerPluginHook('test-plugin', 'document:create', 'test-hook', vi.fn());

      expect(registry.getHookCount('document:create')).toBe(1);

      system.unregisterPlugin('test-plugin');

      expect(registry.getHookCount('document:create')).toBe(0);
    });
  });

  describe('enablePlugin', () => {
    it('should enable a plugin', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        enabled: false,
      };

      system.registerPlugin(metadata);
      expect(system.isPluginEnabled('test-plugin')).toBe(false);

      const result = system.enablePlugin('test-plugin');

      expect(result).toBe(true);
      expect(system.isPluginEnabled('test-plugin')).toBe(true);
    });

    it('should fire plugin:enable event', async () => {
      const handler = vi.fn();
      registry.register('plugin:enable', 'test', handler);

      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        enabled: false,
      };

      system.registerPlugin(metadata);
      system.enablePlugin('test-plugin');

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });

    it('should return false for non-existent plugin', () => {
      const result = system.enablePlugin('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('disablePlugin', () => {
    it('should disable a plugin', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      expect(system.isPluginEnabled('test-plugin')).toBe(true);

      const result = system.disablePlugin('test-plugin');

      expect(result).toBe(true);
      expect(system.isPluginEnabled('test-plugin')).toBe(false);
    });

    it('should fire plugin:disable event', async () => {
      const handler = vi.fn();
      registry.register('plugin:disable', 'test', handler);

      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.disablePlugin('test-plugin');

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
    });

    it('should return false for non-existent plugin', () => {
      const result = system.disablePlugin('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('registerPluginHook', () => {
    it('should register a hook for plugin', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      const hookId = system.registerPluginHook('test-plugin', 'document:create', 'test-hook', vi.fn());

      expect(hookId).toBeDefined();
      expect(registry.getHookCount('document:create')).toBe(1);
    });

    it('should return null for non-existent plugin', () => {
      const hookId = system.registerPluginHook('non-existent', 'document:create', 'test-hook', vi.fn());
      expect(hookId).toBeNull();
    });

    it('should track hook mapping', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.registerPluginHook('test-plugin', 'document:create', 'test-hook', vi.fn());

      const plugin = system.getPlugin('test-plugin');
      expect(plugin?.hooks.has('document:create')).toBe(true);
    });

    it('should support priority', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.registerPluginHook('test-plugin', 'document:create', 'test-hook', vi.fn(), 'high');

      expect(registry.getHookCount('document:create')).toBe(1);
    });
  });

  describe('unregisterPluginHook', () => {
    it('should unregister a plugin hook', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      system.registerPluginHook('test-plugin', 'document:create', 'test-hook', vi.fn());

      expect(registry.getHookCount('document:create')).toBe(1);

      const result = system.unregisterPluginHook('test-plugin', 'document:create');

      expect(result).toBe(true);
      expect(registry.getHookCount('document:create')).toBe(0);
    });

    it('should return false for non-existent plugin', () => {
      const result = system.unregisterPluginHook('non-existent', 'document:create');
      expect(result).toBe(false);
    });

    it('should return false for non-registered hook event', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      const result = system.unregisterPluginHook('test-plugin', 'document:create');
      expect(result).toBe(false);
    });
  });

  describe('getPlugin', () => {
    it('should return plugin by id', () => {
      const metadata: PluginMetadata = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
      };

      system.registerPlugin(metadata);
      const plugin = system.getPlugin('test-plugin');

      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe('test-plugin');
      expect(plugin?.metadata.name).toBe('Test Plugin');
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = system.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('getAllPlugins', () => {
    it('should return all plugins', () => {
      system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0' });
      system.registerPlugin({ id: 'plugin2', name: 'Plugin 2', version: '1.0.0' });

      const plugins = system.getAllPlugins();
      expect(plugins).toHaveLength(2);
    });
  });

  describe('getPluginsByEnabled', () => {
    it('should return enabled plugins', () => {
      system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0', enabled: true });
      system.registerPlugin({ id: 'plugin2', name: 'Plugin 2', version: '1.0.0', enabled: false });

      const enabled = system.getPluginsByEnabled(true);
      const disabled = system.getPluginsByEnabled(false);

      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('plugin1');
      expect(disabled).toHaveLength(1);
      expect(disabled[0].id).toBe('plugin2');
    });
  });

  describe('isPluginLoaded', () => {
    it('should return true for loaded plugin', () => {
      system.registerPlugin({ id: 'test-plugin', name: 'Test Plugin', version: '1.0.0' });
      expect(system.isPluginLoaded('test-plugin')).toBe(true);
    });

    it('should return false for unloaded plugin', () => {
      expect(system.isPluginLoaded('test-plugin')).toBe(false);
    });
  });

  describe('isPluginEnabled', () => {
    it('should return enabled state', () => {
      system.registerPlugin({ id: 'test-plugin', name: 'Test Plugin', version: '1.0.0', enabled: true });
      expect(system.isPluginEnabled('test-plugin')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(system.isPluginEnabled('non-existent')).toBe(false);
    });
  });

  describe('firePluginError', () => {
    it('should fire plugin:error event', async () => {
      const handler = vi.fn();
      registry.register('plugin:error', 'test', handler);

      system.registerPlugin({ id: 'test-plugin', name: 'Test Plugin', version: '1.0.0' });
      const error = new Error('Test error');
      system.firePluginError('test-plugin', error, 'runtime');

      await Promise.resolve();
      expect(handler).toHaveBeenCalled();
      const payload = handler.mock.calls[0][0] as PluginErrorPayload;
      expect(payload.pluginId).toBe('test-plugin');
      expect(payload.pluginName).toBe('Test Plugin');
      expect(payload.error).toBe(error);
      expect(payload.phase).toBe('runtime');
    });

    it('should do nothing for non-existent plugin', async () => {
      const handler = vi.fn();
      registry.register('plugin:error', 'test', handler);

      system.firePluginError('non-existent', new Error('Test error'), 'runtime');

      await Promise.resolve();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getPluginCount', () => {
    it('should return plugin count', () => {
      expect(system.getPluginCount()).toBe(0);
      system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0' });
      expect(system.getPluginCount()).toBe(1);
      system.registerPlugin({ id: 'plugin2', name: 'Plugin 2', version: '1.0.0' });
      expect(system.getPluginCount()).toBe(2);
    });
  });

  describe('getEnabledPluginCount', () => {
    it('should return enabled plugin count', () => {
      system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0', enabled: true });
      system.registerPlugin({ id: 'plugin2', name: 'Plugin 2', version: '1.0.0', enabled: false });

      expect(system.getEnabledPluginCount()).toBe(1);
    });
  });

  describe('hasPlugins', () => {
    it('should return true when plugins exist', () => {
      system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0' });
      expect(system.hasPlugins()).toBe(true);
    });

    it('should return false when no plugins', () => {
      expect(system.hasPlugins()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all plugins and hooks', () => {
      system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0' });
      system.registerPlugin({ id: 'plugin2', name: 'Plugin 2', version: '1.0.0' });
      system.registerPluginHook('plugin1', 'document:create', 'test-hook', vi.fn());

      system.clear();

      expect(system.getPluginCount()).toBe(0);
      expect(system.hasPlugins()).toBe(false);
      expect(registry.getHookCount('document:create')).toBe(0);
    });
  });
});

describe('PluginHookSystem - Integration', () => {
  let registry: HookRegistry;
  let system: PluginHookSystem;

  beforeEach(() => {
    registry = new HookRegistry();
    system = new PluginHookSystem(registry);
  });

  it('should fire all lifecycle events in order', async () => {
    const loadHandler = vi.fn();
    const unloadHandler = vi.fn();
    registry.register('plugin:load', 'load', loadHandler);
    registry.register('plugin:unload', 'unload', unloadHandler);

    const metadata = { id: 'test-plugin', name: 'Test Plugin', version: '1.0.0' };
    system.registerPlugin(metadata);
    system.unregisterPlugin('test-plugin');

    await Promise.resolve();
    expect(loadHandler).toHaveBeenCalledTimes(1);
    expect(unloadHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple plugins with hooks', async () => {
    system.registerPlugin({ id: 'plugin1', name: 'Plugin 1', version: '1.0.0' });
    system.registerPlugin({ id: 'plugin2', name: 'Plugin 2', version: '1.0.0' });

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    system.registerPluginHook('plugin1', 'document:create', 'plugin1-hook', handler1);
    system.registerPluginHook('plugin2', 'document:create', 'plugin2-hook', handler2);

    await registry.fire('document:create', { documentId: 'doc1', timestamp: Date.now() });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});