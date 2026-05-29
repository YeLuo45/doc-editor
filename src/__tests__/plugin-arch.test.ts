/**
 * V60 Plugin Architecture - Test Suite
 */

import { PluginRegistry } from '../plugin-arch/PluginRegistry';
import { PluginLoader } from '../plugin-arch/PluginLoader';
import { PluginSandbox, SandboxManager } from '../plugin-arch/PluginSandbox';
import { PluginLifecycle } from '../plugin-arch/PluginLifecycle';
import type { PluginMetadata } from '../plugins/types';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  const createTestPlugin = (id: string, type: PluginMetadata['type'] = 'formatter'): PluginMetadata => ({
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    type,
    description: 'Test plugin',
    permissions: ['storage'],
  });

  beforeEach(() => {
    registry = new PluginRegistry({ maxPlugins: 10 });
  });

  afterEach(() => {
    registry.reset();
  });

  test('should register a plugin', () => {
    const plugin = createTestPlugin('test-1');
    registry.register(plugin);
    expect(registry.has('test-1')).toBe(true);
  });

  test('should unregister a plugin', () => {
    const plugin = createTestPlugin('test-1');
    registry.register(plugin);
    expect(registry.unregister('test-1')).toBe(true);
    expect(registry.has('test-1')).toBe(false);
  });

  test('should get all registered plugins', () => {
    registry.register(createTestPlugin('p1', 'formatter'));
    registry.register(createTestPlugin('p2', 'ai'));
    const plugins = registry.getPlugins();
    expect(plugins.length).toBe(2);
  });

  test('should enable and disable a plugin', () => {
    registry.register(createTestPlugin('test-1'));
    expect(registry.isEnabled('test-1')).toBe(true);
    registry.disable('test-1');
    expect(registry.isEnabled('test-1')).toBe(false);
    registry.enable('test-1');
    expect(registry.isEnabled('test-1')).toBe(true);
  });

  test('should get snapshot metrics', () => {
    registry.register(createTestPlugin('test-1'));
    registry.register(createTestPlugin('test-2'));
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.totalPlugins).toBe(2);
  });

  test('should reset all plugins', () => {
    registry.register(createTestPlugin('test-1'));
    registry.reset();
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.totalPlugins).toBe(0);
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('PluginRegistry Report');
  });

  test('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V60-PluginRegistry');
    expect(metrics.metrics).toBeDefined();
  });

  test('should set and get plugin priority', () => {
    registry.register(createTestPlugin('test-1'));
    registry.setPriority('test-1', 75);
    expect(registry.getPriority('test-1')).toBe(75);
  });

  test('should get plugins by type', () => {
    registry.register(createTestPlugin('p1', 'formatter'));
    registry.register(createTestPlugin('p2', 'ai'));
    const formatters = registry.getPluginsByType('formatter');
    expect(formatters.length).toBe(1);
  });
});

describe('PluginLoader', () => {
  let loader: PluginLoader;

  const createTestMetadata = (id: string): PluginMetadata => ({
    id,
    name: `Loader Test ${id}`,
    version: '1.0.0',
    type: 'formatter',
    description: 'Test',
    permissions: [],
  });

  beforeEach(() => {
    loader = new PluginLoader({ maxConcurrent: 3 });
  });

  afterEach(() => {
    loader.reset();
  });

  test('should load a plugin', async () => {
    const metadata = createTestMetadata('load-1');
    const result = await loader.load(metadata);
    expect(result).toBe(true);
    expect(loader.isLoaded('load-1')).toBe(true);
  });

  test('should unload a plugin', async () => {
    const metadata = createTestMetadata('load-1');
    await loader.load(metadata);
    expect(loader.unload('load-1')).toBe(true);
    expect(loader.isLoaded('load-1')).toBe(false);
  });

  test('should check if plugin is loaded', async () => {
    const metadata = createTestMetadata('load-1');
    await loader.load(metadata);
    expect(loader.isLoaded('load-1')).toBe(true);
    expect(loader.isLoaded('load-2')).toBe(false);
  });

  test('should get all loaded plugins', async () => {
    await loader.load(createTestMetadata('load-1'));
    await loader.load(createTestMetadata('load-2'));
    const loaded = loader.getLoaded();
    expect(loaded.length).toBe(2);
  });

  test('should enqueue and dequeue plugins', () => {
    loader.enqueue('p1');
    loader.enqueue('p2');
    expect(loader.getQueueSize()).toBe(2);
    expect(loader.isInQueue('p1')).toBe(true);
    loader.dequeue('p1');
    expect(loader.isInQueue('p1')).toBe(false);
  });

  test('should clear queue', () => {
    loader.enqueue('p1');
    loader.enqueue('p2');
    loader.clearQueue();
    expect(loader.getQueueSize()).toBe(0);
  });

  test('should get snapshot metrics', async () => {
    await loader.load(createTestMetadata('load-1'));
    const snapshot = loader.getSnapshot();
    expect(snapshot.metrics.totalLoaded).toBe(1);
  });

  test('should reset loader', async () => {
    await loader.load(createTestMetadata('load-1'));
    loader.reset();
    const snapshot = loader.getSnapshot();
    expect(snapshot.metrics.totalLoaded).toBe(0);
  });

  test('should generate report', () => {
    const report = loader.getReport();
    expect(report).toContain('PluginLoader Report');
  });

  test('should export metrics with version', () => {
    const metrics = loader.exportMetrics();
    expect(metrics.version).toBe('V60-PluginLoader');
  });
});

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;

  beforeEach(() => {
    sandbox = new PluginSandbox('test-plugin', { timeout: 1000 });
  });

  afterEach(() => {
    sandbox.reset();
  });

  test('should create sandbox for plugin', () => {
    expect(sandbox.getPluginId()).toBe('test-plugin');
    expect(sandbox.isActive()).toBe(true);
  });

  test('should execute code in sandbox', () => {
    const result = sandbox.execute('console.log("test")');
    expect(result.success).toBe(true);
    expect(sandbox.getExecutionCount()).toBe(1);
  });

  test('should terminate sandbox', () => {
    sandbox.terminate();
    expect(sandbox.isActive()).toBe(false);
  });

  test('should get permissions', () => {
    const permissions = sandbox.getPermissions();
    expect(permissions.length).toBeGreaterThan(0);
    expect(sandbox.hasPermission('fetch')).toBe(true);
  });

  test('should grant and revoke permissions', () => {
    sandbox.grantPermission('newApi');
    expect(sandbox.hasPermission('newApi')).toBe(true);
    sandbox.revokePermission('newApi');
    expect(sandbox.hasPermission('newApi')).toBe(false);
  });

  test('should get snapshot metrics', () => {
    sandbox.execute('code');
    const snapshot = sandbox.getSnapshot();
    expect(snapshot.metrics.executionCount).toBe(1);
  });

  test('should reset sandbox', () => {
    sandbox.execute('code');
    sandbox.reset();
    expect(sandbox.getExecutionCount()).toBe(0);
    expect(sandbox.isActive()).toBe(true);
  });

  test('should generate report', () => {
    const report = sandbox.getReport();
    expect(report).toContain('PluginSandbox Report');
  });

  test('should export metrics with version', () => {
    const metrics = sandbox.exportMetrics();
    expect(metrics.version).toBe('V60-PluginSandbox');
  });

  test('should create new sandbox instance', () => {
    const newSandbox = sandbox.create('new-plugin');
    expect(newSandbox.getPluginId()).toBe('new-plugin');
  });
});

describe('SandboxManager', () => {
  let manager: SandboxManager;

  beforeEach(() => {
    manager = new SandboxManager({ timeout: 5000 });
  });

  afterEach(() => {
    manager.reset();
  });

  test('should create sandbox', () => {
    const sb = manager.create('plugin-1');
    expect(sb.getPluginId()).toBe('plugin-1');
    expect(manager.has('plugin-1')).toBe(true);
  });

  test('should get sandbox', () => {
    manager.create('plugin-1');
    const sb = manager.get('plugin-1');
    expect(sb?.getPluginId()).toBe('plugin-1');
  });

  test('should remove sandbox', () => {
    manager.create('plugin-1');
    expect(manager.remove('plugin-1')).toBe(true);
    expect(manager.has('plugin-1')).toBe(false);
  });

  test('should terminate all sandboxes', () => {
    manager.create('plugin-1');
    manager.create('plugin-2');
    manager.terminateAll();
    expect(manager.size()).toBe(0);
  });

  test('should get active sandboxes', () => {
    manager.create('plugin-1');
    manager.create('plugin-2');
    const active = manager.getActive();
    expect(active.length).toBe(2);
  });

  test('should get snapshot metrics', () => {
    manager.create('plugin-1');
    manager.create('plugin-2');
    const snapshot = manager.getSnapshot();
    expect(snapshot.metrics.totalSandboxes).toBe(2);
  });

  test('should reset manager', () => {
    manager.create('plugin-1');
    manager.reset();
    expect(manager.size()).toBe(0);
  });

  test('should generate report', () => {
    const report = manager.getReport();
    expect(report).toContain('SandboxManager Report');
  });

  test('should export metrics with version', () => {
    const metrics = manager.exportMetrics();
    expect(metrics.version).toBe('V60-SandboxManager');
  });
});

describe('PluginLifecycle', () => {
  let lifecycle: PluginLifecycle;

  beforeEach(() => {
    lifecycle = new PluginLifecycle('test-plugin', { defaultTimeout: 1000 });
  });

  afterEach(() => {
    lifecycle.reset();
  });

  test('should init plugin', async () => {
    const result = await lifecycle.init();
    expect(result).toBe(true);
  });

  test('should start plugin', async () => {
    await lifecycle.init();
    const result = await lifecycle.start();
    expect(result).toBe(true);
  });

  test('should stop plugin', async () => {
    await lifecycle.init();
    await lifecycle.start();
    const result = await lifecycle.stop();
    expect(result).toBe(true);
  });

  test('should destroy plugin', async () => {
    await lifecycle.init();
    await lifecycle.start();
    await lifecycle.stop();
    const result = await lifecycle.destroy();
    expect(result).toBe(true);
  });

  test('should register lifecycle hook', () => {
    const hookId = lifecycle.register({
      phase: 'init',
      fn: async () => {},
      priority: 50,
      timeout: 1000,
    });
    expect(hookId).toBeDefined();
    const hooks = lifecycle.getHooks('init');
    expect(hooks.length).toBe(1);
  });

  test('should unregister lifecycle hook', () => {
    const hookId = lifecycle.register({
      phase: 'init',
      fn: async () => {},
      priority: 50,
    });
    expect(lifecycle.unregister(hookId)).toBe(true);
  });

  test('should get lifecycle state', () => {
    const state = lifecycle.getState('init');
    expect(state).toBeDefined();
    expect(state?.phase).toBe('init');
  });

  test('should get snapshot metrics', async () => {
    await lifecycle.init();
    const snapshot = lifecycle.getSnapshot();
    expect(snapshot.metrics.pluginId).toBe('test-plugin');
  });

  test('should reset lifecycle', () => {
    lifecycle.register({
      phase: 'init',
      fn: async () => {},
      priority: 50,
    });
    lifecycle.reset();
    expect(lifecycle.getHooks('init').length).toBe(0);
  });

  test('should generate report', () => {
    const report = lifecycle.getReport();
    expect(report).toContain('PluginLifecycle Report');
  });

  test('should export metrics with version', () => {
    const metrics = lifecycle.exportMetrics();
    expect(metrics.version).toBe('V60-PluginLifecycle');
  });
});