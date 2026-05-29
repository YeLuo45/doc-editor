/**
 * plugin-manager.test.ts - V77 Plugin Manager Tests
 * Tests for PluginRegistry, PluginLoader, PluginSandbox, and PluginLifecycle
 */

import { PluginRegistry, PluginConfig } from '../plugin-manager/PluginRegistry';
import { PluginLoader, LoadedPlugin } from '../plugin-manager/PluginLoader';
import { PluginSandbox, SandboxPermissions, SandboxConfig } from '../plugin-manager/PluginSandbox';
import { PluginLifecycle, PluginState, LifecycleConfig } from '../plugin-manager/PluginLifecycle';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  test('should register a plugin', () => {
    const plugin: PluginConfig = { id: 'p1', name: 'Test', version: '1.0.0', enabled: false };
    expect(registry.register(plugin)).toBe(true);
    expect(registry.getPlugins().length).toBe(1);
  });

  test('should unregister a plugin', () => {
    const plugin: PluginConfig = { id: 'p1', name: 'Test', version: '1.0.0', enabled: false };
    registry.register(plugin);
    expect(registry.unregister('p1')).toBe(true);
    expect(registry.getPlugins().length).toBe(0);
  });

  test('should enable and disable a plugin', () => {
    const plugin: PluginConfig = { id: 'p1', name: 'Test', version: '1.0.0', enabled: false };
    registry.register(plugin);
    expect(registry.enable('p1')).toBe(true);
    expect(registry.isEnabled('p1')).toBe(true);
    expect(registry.disable('p1')).toBe(true);
    expect(registry.isEnabled('p1')).toBe(false);
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalPlugins');
  });

  test('should reset registry', () => {
    const plugin: PluginConfig = { id: 'p1', name: 'Test', version: '1.0.0', enabled: false };
    registry.register(plugin);
    registry.reset();
    expect(registry.getPlugins().length).toBe(0);
  });

  test('should getReport return string', () => {
    const report = registry.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Plugin Registry Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  test('should load a plugin', () => {
    expect(loader.load('p1', 'Test', '1.0.0', '/path/to/plugin')).toBe(true);
    expect(loader.getLoaded().length).toBe(1);
  });

  test('should not load duplicate plugin', () => {
    loader.load('p1', 'Test', '1.0.0', '/path/to/plugin');
    expect(loader.load('p1', 'Test', '1.0.0', '/path/to/plugin')).toBe(false);
  });

  test('should unload a plugin', () => {
    loader.load('p1', 'Test', '1.0.0', '/path/to/plugin');
    expect(loader.unload('p1')).toBe(true);
    expect(loader.getLoaded().length).toBe(0);
  });

  test('should getLoaded return loaded plugins', () => {
    loader.load('p1', 'Test', '1.0.0', '/path/to/plugin');
    loader.load('p2', 'Test2', '1.0.0', '/path/to/plugin2');
    expect(loader.getLoaded().length).toBe(2);
  });

  test('should getInfo return plugin info', () => {
    loader.load('p1', 'Test', '1.0.0', '/path/to/plugin');
    const info = loader.getInfo('p1');
    expect(info).toBeDefined();
    expect(info?.id).toBe('p1');
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = loader.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalLoaded');
  });

  test('should reset loader', () => {
    loader.load('p1', 'Test', '1.0.0', '/path/to/plugin');
    loader.reset();
    expect(loader.getLoaded().length).toBe(0);
  });

  test('should getReport return string', () => {
    const report = loader.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Plugin Loader Report');
  });
});

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;

  beforeEach(() => {
    sandbox = new PluginSandbox();
  });

  test('should isolate a plugin with permissions', () => {
    const permissions: SandboxPermissions = {
      canAccessNetwork: true,
      canAccessFileSystem: false,
      canExecuteCode: true,
    };
    expect(sandbox.isolate('p1', permissions)).toBe(true);
    expect(sandbox.getPermissions('p1')).toBeDefined();
  });

  test('should execute code in sandbox', () => {
    sandbox.isolate('p1', { canAccessNetwork: false, canAccessFileSystem: false, canExecuteCode: true });
    const result = sandbox.execute('p1', 'return 42');
    expect(result.success).toBe(true);
    expect(result.result).toBe(42);
  });

  test('should getPermissions return permissions', () => {
    const permissions: SandboxPermissions = {
      canAccessNetwork: true,
      canAccessFileSystem: true,
      canExecuteCode: false,
    };
    sandbox.isolate('p1', permissions);
    const perms = sandbox.getPermissions('p1');
    expect(perms?.canAccessNetwork).toBe(true);
  });

  test('should getStats return sandbox stats', () => {
    sandbox.isolate('p1', { canAccessNetwork: false, canAccessFileSystem: false, canExecuteCode: true });
    sandbox.execute('p1', 'return 1');
    const stats = sandbox.getStats();
    expect(stats).toHaveProperty('totalExecutions');
    expect(stats.totalExecutions).toBeGreaterThan(0);
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = sandbox.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  test('should reset sandbox', () => {
    sandbox.isolate('p1', { canAccessNetwork: false, canAccessFileSystem: false, canExecuteCode: true });
    sandbox.reset();
    expect(sandbox.getPermissions('p1')).toBeUndefined();
  });

  test('should getReport return string', () => {
    const report = sandbox.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Plugin Sandbox Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = sandbox.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('PluginLifecycle', () => {
  let lifecycle: PluginLifecycle;

  beforeEach(() => {
    lifecycle = new PluginLifecycle();
  });

  test('should initialize a plugin', () => {
    expect(lifecycle.init('p1')).toBe(true);
    expect(lifecycle.getState('p1')).toBe('initialized');
  });

  test('should start an initialized plugin', () => {
    lifecycle.init('p1');
    expect(lifecycle.start('p1')).toBe(true);
    expect(lifecycle.getState('p1')).toBe('started');
  });

  test('should stop a started plugin', () => {
    lifecycle.init('p1');
    lifecycle.start('p1');
    expect(lifecycle.stop('p1')).toBe(true);
    expect(lifecycle.getState('p1')).toBe('stopped');
  });

  test('should destroy a plugin', () => {
    lifecycle.init('p1');
    lifecycle.start('p1');
    expect(lifecycle.destroy('p1')).toBe(true);
    expect(lifecycle.getState('p1')).toBeUndefined();
  });

  test('should getSnapshot return metrics', () => {
    lifecycle.init('p1');
    const snapshot = lifecycle.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalPlugins');
  });

  test('should reset lifecycle', () => {
    lifecycle.init('p1');
    lifecycle.reset();
    expect(lifecycle.getState('p1')).toBeUndefined();
  });

  test('should getReport return string', () => {
    const report = lifecycle.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Plugin Lifecycle Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = lifecycle.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('Plugin Manager Integration', () => {
  test('should work together across all components', () => {
    const registry = new PluginRegistry();
    const loader = new PluginLoader();
    const sandbox = new PluginSandbox();
    const lifecycle = new PluginLifecycle();

    // Register
    const plugin: PluginConfig = { id: 'p1', name: 'Test', version: '1.0.0', enabled: false };
    registry.register(plugin);
    registry.enable('p1');
    expect(registry.isEnabled('p1')).toBe(true);

    // Load
    loader.load('p1', 'Test', '1.0.0', '/path/to/plugin');
    expect(loader.isLoaded('p1')).toBe(true);

    // Isolate
    sandbox.isolate('p1', { canAccessNetwork: true, canAccessFileSystem: false, canExecuteCode: true });
    expect(sandbox.getPermissions('p1')).toBeDefined();

    // Lifecycle
    lifecycle.init('p1');
    lifecycle.start('p1');
    expect(lifecycle.getState('p1')).toBe('started');

    // All snapshots work
    expect(registry.getSnapshot()).toHaveProperty('metrics');
    expect(loader.getSnapshot()).toHaveProperty('metrics');
    expect(sandbox.getSnapshot()).toHaveProperty('metrics');
    expect(lifecycle.getSnapshot()).toHaveProperty('metrics');
  });
});