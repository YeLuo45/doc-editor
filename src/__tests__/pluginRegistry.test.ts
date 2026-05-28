/**
 * PluginRegistry Tests
 * Testing plugin registration, activation, execution and lifecycle
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginRegistry, getPluginRegistry, resetPluginRegistry } from '../plugins/PluginRegistry';
import type { PluginMetadata, PluginType } from '../plugins/types';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  const createMockPlugin = (overrides: Partial<PluginMetadata> = {}): PluginMetadata => ({
    id: `plugin-${Math.random().toString(36).slice(2)}`,
    name: 'Test Plugin',
    version: '1.0.0',
    type: 'tool' as PluginType,
    description: 'A test plugin',
    permissions: [],
    ...overrides,
  });

  beforeEach(() => {
    resetPluginRegistry();
    localStorage.clear();
    registry = new PluginRegistry();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    it('should register a valid plugin', () => {
      const plugin = createMockPlugin({ id: 'test-plugin-1', name: 'Test Plugin' });
      registry.register(plugin);
      expect(registry.has('test-plugin-1')).toBe(true);
    });

    it('should throw error for duplicate plugin', () => {
      const plugin = createMockPlugin({ id: 'duplicate-test' });
      registry.register(plugin);
      expect(() => registry.register(plugin)).toThrow('Plugin duplicate-test already registered');
    });

    it('should register multiple plugins', () => {
      registry.register(createMockPlugin({ id: 'p1' }));
      registry.register(createMockPlugin({ id: 'p2' }));
      registry.register(createMockPlugin({ id: 'p3' }));
      expect(registry.size()).toBe(3);
    });

    it('should store plugin config', () => {
      const plugin = createMockPlugin({ id: 'config-test' });
      const config = { setting1: 'value1', setting2: 42 };
      registry.register(plugin, config);
      expect(registry.getConfig('config-test')).toEqual(config);
    });
  });

  describe('unregister', () => {
    it('should unregister existing plugin', () => {
      registry.register(createMockPlugin({ id: 'unreg-test' }));
      expect(registry.unregister('unreg-test')).toBe(true);
      expect(registry.has('unreg-test')).toBe(false);
    });

    it('should return false for non-existent plugin', () => {
      expect(registry.unregister('non-existent')).toBe(false);
    });

    it('should clear feature flags when unregistering', () => {
      registry.register(createMockPlugin({ id: 'ff-test' }));
      registry.setFeatureFlag('ff-test', {
        pluginId: 'ff-test',
        enabled: true,
        rollout: 100,
        config: {},
      });
      registry.unregister('ff-test');
      expect(registry.getFeatureFlag('ff-test')).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should return plugin metadata', () => {
      const plugin = createMockPlugin({ id: 'get-test', name: 'GetTestPlugin' });
      registry.register(plugin);
      const retrieved = registry.get('get-test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('GetTestPlugin');
    });

    it('should return undefined for non-existent plugin', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered plugins', () => {
      registry.register(createMockPlugin({ id: 'list-1' }));
      registry.register(createMockPlugin({ id: 'list-2' }));
      const plugins = registry.list();
      expect(plugins).toHaveLength(2);
    });

    it('should return empty array when no plugins', () => {
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe('findByType', () => {
    it('should filter plugins by type', () => {
      registry.register(createMockPlugin({ id: 'fmt-1', type: 'formatter' }));
      registry.register(createMockPlugin({ id: 'ai-1', type: 'ai' }));
      registry.register(createMockPlugin({ id: 'fmt-2', type: 'formatter' }));
      const formatters = registry.findByType('formatter');
      expect(formatters).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true for registered plugin', () => {
      registry.register(createMockPlugin({ id: 'has-test' }));
      expect(registry.has('has-test')).toBe(true);
    });

    it('should return false for unregistered plugin', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct count', () => {
      expect(registry.size()).toBe(0);
      registry.register(createMockPlugin({ id: 's1' }));
      expect(registry.size()).toBe(1);
      registry.register(createMockPlugin({ id: 's2' }));
      expect(registry.size()).toBe(2);
    });
  });

  describe('activate/deactivate', () => {
    it('should activate registered plugin', () => {
      registry.register(createMockPlugin({ id: 'act-test' }));
      expect(registry.activate('act-test')).toBe(true);
      expect(registry.getStatus('act-test')).toBe('activated');
    });

    it('should return false for non-existent plugin', () => {
      expect(registry.activate('non-existent')).toBe(false);
    });

    it('should deactivate activated plugin', () => {
      registry.register(createMockPlugin({ id: 'deact-test' }));
      registry.activate('deact-test');
      expect(registry.deactivate('deact-test')).toBe(true);
      expect(registry.getStatus('deact-test')).toBe('deactivated');
    });

    it('should remove sandbox on deactivate', () => {
      registry.register(createMockPlugin({ id: 'sbx-test' }));
      registry.addSandbox('sbx-test');
      registry.deactivate('sbx-test');
      expect(registry.hasSandbox('sbx-test')).toBe(false);
    });
  });

  describe('enable/disable', () => {
    it('should enable plugin', () => {
      registry.register(createMockPlugin({ id: 'en-test' }));
      expect(registry.enable('en-test')).toBe(true);
      expect(registry.isEnabled('en-test')).toBe(true);
    });

    it('should disable plugin', () => {
      registry.register(createMockPlugin({ id: 'dis-test' }));
      registry.enable('dis-test');
      expect(registry.disable('dis-test')).toBe(true);
      expect(registry.isEnabled('dis-test')).toBe(false);
    });

    it('should return false for non-existent plugin', () => {
      expect(registry.enable('non-existent')).toBe(false);
      expect(registry.disable('non-existent')).toBe(false);
    });
  });

  describe('priority', () => {
    it('should set and get priority', () => {
      registry.register(createMockPlugin({ id: 'prio-test' }));
      expect(registry.setPriority('prio-test', 75)).toBe(true);
      expect(registry.getPriority('prio-test')).toBe(75);
    });

    it('should clamp priority to 0-100', () => {
      registry.register(createMockPlugin({ id: 'prio-clamp' }));
      registry.setPriority('prio-clamp', 150);
      expect(registry.getPriority('prio-clamp')).toBe(100);
      registry.setPriority('prio-clamp', -10);
      expect(registry.getPriority('prio-clamp')).toBe(0);
    });
  });

  describe('getByStatus', () => {
    it('should return plugins with specific status', () => {
      registry.register(createMockPlugin({ id: 'status-1' }));
      registry.register(createMockPlugin({ id: 'status-2' }));
      registry.activate('status-1');
      const activated = registry.getByStatus('activated');
      expect(activated).toHaveLength(1);
      expect(activated[0].metadata.id).toBe('status-1');
    });
  });

  describe('execute', () => {
    it('should return error for non-existent plugin', async () => {
      const result = await registry.execute('non-existent', { type: 'test', data: {} });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error for disabled plugin', async () => {
      registry.register(createMockPlugin({ id: 'disabled-exec' }));
      registry.disable('disabled-exec');
      const result = await registry.execute('disabled-exec', { type: 'test', data: {} });
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should return error for non-activated plugin', async () => {
      registry.register(createMockPlugin({ id: 'not-active-exec' }));
      const result = await registry.execute('not-active-exec', { type: 'test', data: {} });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not activated');
    });

    it('should execute activated plugin', async () => {
      registry.register(createMockPlugin({ id: 'exec-ok' }));
      registry.activate('exec-ok');
      const result = await registry.execute('exec-ok', { type: 'test', data: { value: 42 } });
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sandbox management', () => {
    it('should add and track active sandbox', () => {
      registry.register(createMockPlugin({ id: 'sbx-add' }));
      registry.addSandbox('sbx-add');
      expect(registry.hasSandbox('sbx-add')).toBe(true);
    });

    it('should remove sandbox', () => {
      registry.register(createMockPlugin({ id: 'sbx-remove' }));
      registry.addSandbox('sbx-remove');
      registry.removeSandbox('sbx-remove');
      expect(registry.hasSandbox('sbx-remove')).toBe(false);
    });

    it('should get all active sandboxes', () => {
      registry.register(createMockPlugin({ id: 'sbx-1' }));
      registry.register(createMockPlugin({ id: 'sbx-2' }));
      registry.addSandbox('sbx-1');
      registry.addSandbox('sbx-2');
      const sandboxes = registry.getActiveSandboxes();
      expect(sandboxes).toContain('sbx-1');
      expect(sandboxes).toContain('sbx-2');
    });
  });

  describe('feature flags', () => {
    it('should set and get feature flag', () => {
      registry.register(createMockPlugin({ id: 'ff-set' }));
      const flag = {
        pluginId: 'ff-set',
        enabled: true,
        rollout: 50,
        config: { key: 'value' },
      };
      registry.setFeatureFlag('ff-set', flag);
      expect(registry.getFeatureFlag('ff-set')).toEqual(flag);
    });

    it('should check feature enabled with 100% rollout', () => {
      registry.register(createMockPlugin({ id: 'ff-full' }));
      registry.setFeatureFlag('ff-full', { pluginId: 'ff-full', enabled: true, rollout: 100, config: {} });
      // Run multiple times to ensure it always returns true at 100%
      for (let i = 0; i < 10; i++) {
        expect(registry.isFeatureEnabled('ff-full')).toBe(true);
      }
    });

    it('should check feature disabled with 0% rollout', () => {
      registry.register(createMockPlugin({ id: 'ff-none' }));
      registry.setFeatureFlag('ff-none', { pluginId: 'ff-none', enabled: true, rollout: 0, config: {} });
      expect(registry.isFeatureEnabled('ff-none')).toBe(false);
    });

    it('should return false when feature not enabled', () => {
      registry.register(createMockPlugin({ id: 'ff-disabled' }));
      registry.setFeatureFlag('ff-disabled', { pluginId: 'ff-disabled', enabled: false, rollout: 100, config: {} });
      expect(registry.isFeatureEnabled('ff-disabled')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all plugins', () => {
      registry.register(createMockPlugin({ id: 'clear-1' }));
      registry.register(createMockPlugin({ id: 'clear-2' }));
      registry.clear();
      expect(registry.size()).toBe(0);
    });

    it('should clear feature flags and sandboxes', () => {
      registry.register(createMockPlugin({ id: 'clear-all' }));
      registry.addSandbox('clear-all');
      registry.setFeatureFlag('clear-all', { pluginId: 'clear-all', enabled: true, rollout: 100, config: {} });
      registry.clear();
      expect(registry.hasSandbox('clear-all')).toBe(false);
      expect(registry.getFeatureFlag('clear-all')).toBeUndefined();
    });
  });

  describe('singleton', () => {
    it('should return same instance from getPluginRegistry', () => {
      const instance1 = getPluginRegistry();
      const instance2 = getPluginRegistry();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getPluginRegistry();
      resetPluginRegistry();
      const instance2 = getPluginRegistry();
      expect(instance1).not.toBe(instance2);
    });
  });
});