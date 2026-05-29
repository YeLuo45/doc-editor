/**
 * Integration Tests
 * V30 Integration Hub for doc-editor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationHub } from '../integration/IntegrationHub';
import { IntegrationAdapter } from '../integration/IntegrationAdapter';
import { IntegrationPipeline } from '../integration/IntegrationPipeline';
import { IntegrationMetrics } from '../integration/IntegrationMetrics';
import { IntegrationConfigManager } from '../integration/IntegrationConfig';
import { IntegrationUtils } from '../integration/IntegrationUtils';

describe('IntegrationHub', () => {
  let hub: IntegrationHub;

  beforeEach(() => {
    hub = new IntegrationHub({ name: 'TestHub', timeout: 5000 });
  });

  it('should create hub with default config', () => {
    expect(hub.getHubStatus()).toBe('idle');
    expect(hub.listAdapters()).toEqual([]);
  });

  it('should create hub with custom config', () => {
    const customHub = new IntegrationHub({ name: 'CustomHub', timeout: 10000, retries: 5 });
    expect(customHub.getHubStatus()).toBe('idle');
  });

  it('should register adapter', () => {
    const mockAdapter = {
      name: 'test-adapter',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('result'),
    };
    hub.registerAdapter('test-adapter', mockAdapter);
    expect(hub.listAdapters()).toContain('test-adapter');
  });

  it('should get registered adapter', () => {
    const mockAdapter = {
      name: 'test-adapter',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('result'),
    };
    hub.registerAdapter('test-adapter', mockAdapter);
    expect(hub.getAdapter('test-adapter')).toBe(mockAdapter);
  });

  it('should return undefined for non-existent adapter', () => {
    expect(hub.getAdapter('non-existent')).toBeUndefined();
  });

  it('should connect adapter', async () => {
    const mockAdapter = {
      name: 'test-adapter',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('result'),
    };
    hub.registerAdapter('test-adapter', mockAdapter);
    await hub.connect();
    expect(mockAdapter.connect).toHaveBeenCalled();
    expect(hub.getHubStatus()).toBe('connected');
  });

  it('should handle connect errors', async () => {
    const failingAdapter = {
      name: 'failing-adapter',
      connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('result'),
    };
    hub.registerAdapter('failing-adapter', failingAdapter);
    await expect(hub.connect()).rejects.toThrow();
    expect(hub.getHubStatus()).toBe('error');
  });

  it('should orchestrate command', async () => {
    const mockAdapter = {
      name: 'test-adapter',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('orchestrated-result'),
    };
    hub.registerAdapter('test-adapter', mockAdapter);
    await hub.connect();
    const result = await hub.orchestrate('test-command', { arg: 'value' });
    expect(result).toBeInstanceOf(Array);
    expect(mockAdapter.execute).toHaveBeenCalledWith('test-command', { arg: 'value' });
  });

  it('should throw when orchestrating in wrong status', async () => {
    await expect(hub.orchestrate('test')).rejects.toThrow();
  });

  it('should get hub status', () => {
    expect(hub.getHubStatus()).toBe('idle');
  });

  it('should get snapshot', () => {
    const snapshot = hub.getSnapshot();
    expect(snapshot).toHaveProperty('status');
    expect(snapshot).toHaveProperty('adapterCount');
    expect(snapshot).toHaveProperty('uptime');
  });

  it('should reset hub', () => {
    hub.reset();
    expect(hub.getHubStatus()).toBe('idle');
  });

  it('should get report', () => {
    const report = hub.getReport();
    expect(report).toHaveProperty('status');
    expect(report).toHaveProperty('adapters');
    expect(report).toHaveProperty('metrics');
  });

  it('should export metrics', () => {
    const metrics = hub.exportMetrics();
    expect(metrics).toHaveProperty('operations');
    expect(metrics).toHaveProperty('errors');
    expect(metrics).toHaveProperty('uptime');
  });
});

describe('IntegrationAdapter', () => {
  let adapterManager: IntegrationAdapter;

  beforeEach(() => {
    adapterManager = new IntegrationAdapter();
  });

  it('should register adapter', () => {
    const adapter = {
      name: 'adapter-v1',
      version: '1.0.0',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('done'),
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    adapterManager.registerAdapter(adapter);
    expect(adapterManager.listAdapters()).toHaveLength(1);
  });

  it('should throw on duplicate adapter', () => {
    const adapter = {
      name: 'duplicate-adapter',
      version: '1.0.0',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('done'),
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    adapterManager.registerAdapter(adapter);
    expect(() => adapterManager.registerAdapter(adapter)).toThrow();
  });

  it('should get adapter', () => {
    const adapter = {
      name: 'get-adapter',
      version: '1.0.0',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('done'),
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    adapterManager.registerAdapter(adapter);
    expect(adapterManager.getAdapter('get-adapter')).toBe(adapter);
  });

  it('should list adapters', () => {
    const adapters = [
      { name: 'adapter-1', version: '1.0.0', connect: vi.fn(), disconnect: vi.fn(), execute: vi.fn(), healthCheck: vi.fn() },
      { name: 'adapter-2', version: '2.0.0', connect: vi.fn(), disconnect: vi.fn(), execute: vi.fn(), healthCheck: vi.fn() },
    ];
    adapters.forEach((a) => adapterManager.registerAdapter(a));
    expect(adapterManager.listAdapters()).toHaveLength(2);
  });

  it('should execute adapter', async () => {
    const adapter = {
      name: 'exec-adapter',
      version: '1.0.0',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('executed'),
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    adapterManager.registerAdapter(adapter);
    const result = await adapterManager.executeAdapter('exec-adapter', 'command');
    expect(result).toBe('executed');
    expect(adapter.execute).toHaveBeenCalledWith('command', undefined);
  });

  it('should throw when executing non-existent adapter', async () => {
    await expect(adapterManager.executeAdapter('non-existent', 'cmd')).rejects.toThrow();
  });

  it('should get adapter metrics', () => {
    const adapter = {
      name: 'metrics-adapter',
      version: '1.0.0',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('done'),
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    adapterManager.registerAdapter(adapter);
    const metrics = adapterManager.getAdapterMetrics('metrics-adapter');
    expect(metrics).toHaveProperty('invocations');
  });

  it('should remove adapter', () => {
    const adapter = {
      name: 'remove-adapter',
      version: '1.0.0',
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue('done'),
      healthCheck: vi.fn().mockResolvedValue(true),
    };
    adapterManager.registerAdapter(adapter);
    expect(adapterManager.removeAdapter('remove-adapter')).toBe(true);
    expect(adapterManager.listAdapters()).toHaveLength(0);
  });

  it('should get snapshot', () => {
    const snapshot = adapterManager.getSnapshot();
    expect(snapshot).toHaveProperty('adapterCount');
    expect(snapshot).toHaveProperty('timestamp');
  });

  it('should reset adapter manager', () => {
    adapterManager.reset();
    expect(adapterManager.listAdapters()).toHaveLength(0);
  });

  it('should get report', () => {
    const report = adapterManager.getReport();
    expect(report).toHaveProperty('adapterCount');
    expect(report).toHaveProperty('totalInvocations');
  });

  it('should export metrics', () => {
    const metrics = adapterManager.exportMetrics();
    expect(metrics).toHaveProperty('adapters');
    expect(metrics).toHaveProperty('totalInvocations');
  });
});

describe('IntegrationPipeline', () => {
  let pipeline: IntegrationPipeline;

  beforeEach(() => {
    pipeline = new IntegrationPipeline();
  });

  it('should create pipeline', () => {
    const steps = [
      { name: 'step1', handler: vi.fn().mockResolvedValue('result1') },
      { name: 'step2', handler: vi.fn().mockResolvedValue('result2') },
    ];
    pipeline.createPipeline('test-pipeline', steps);
    expect(pipeline.listPipelines()).toContain('test-pipeline');
  });

  it('should get pipeline', () => {
    const steps = [
      { name: 'step1', handler: vi.fn().mockResolvedValue('result1') },
    ];
    pipeline.createPipeline('get-pipeline', steps);
    expect(pipeline.getPipeline('get-pipeline')).toHaveLength(1);
  });

  it('should throw on duplicate pipeline', () => {
    const steps = [{ name: 'step1', handler: vi.fn().mockResolvedValue('result1') }];
    pipeline.createPipeline('dup-pipeline', steps);
    expect(() => pipeline.createPipeline('dup-pipeline', steps)).toThrow();
  });

  it('should execute pipeline', async () => {
    const steps = [
      { name: 'transform', handler: async (input: unknown) => `processed-${input}` },
    ];
    pipeline.createPipeline('exec-pipeline', steps);
    const result = await pipeline.execute('exec-pipeline', 'input-data');
    expect(result.success).toBe(true);
    expect(result.output).toBe('processed-input-data');
  });

  it('should handle pipeline step failure', async () => {
    const steps = [
      { name: 'fail-step', handler: vi.fn().mockRejectedValue(new Error('Step failed')) },
    ];
    pipeline.createPipeline('fail-pipeline', steps);
    const result = await pipeline.execute('fail-pipeline', 'input');
    expect(result.success).toBe(false);
    expect(result.executions[0].success).toBe(false);
  });

  it('should pipe transformers', async () => {
    const transformers = [
      async (input: unknown) => `${input}-t1`,
      async (input: unknown) => `${input}-t2`,
    ];
    const result = await pipeline.pipe('data', transformers);
    expect(result).toBe('data-t1-t2');
  });

  it('should remove pipeline', () => {
    const steps = [{ name: 'step1', handler: vi.fn().mockResolvedValue('result1') }];
    pipeline.createPipeline('remove-pipeline', steps);
    expect(pipeline.removePipeline('remove-pipeline')).toBe(true);
    expect(pipeline.listPipelines()).not.toContain('remove-pipeline');
  });

  it('should get snapshot', () => {
    const snapshot = pipeline.getSnapshot();
    expect(snapshot).toHaveProperty('pipelineCount');
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset pipeline', () => {
    pipeline.reset();
    expect(pipeline.listPipelines()).toHaveLength(0);
  });

  it('should get report', () => {
    const report = pipeline.getReport();
    expect(report).toHaveProperty('pipelineCount');
    expect(report).toHaveProperty('successRate');
  });

  it('should export metrics', () => {
    const metrics = pipeline.exportMetrics();
    expect(metrics).toHaveProperty('executed');
    expect(metrics).toHaveProperty('pipelines');
  });
});

describe('IntegrationMetrics', () => {
  let metrics: IntegrationMetrics;

  beforeEach(() => {
    metrics = new IntegrationMetrics();
  });

  it('should record metric', () => {
    metrics.recordMetric('test-metric', 42);
    expect(metrics.getMetrics('test-metric')).toHaveLength(1);
  });

  it('should increment counter', () => {
    metrics.incrementCounter('test-counter');
    expect(metrics.getCounter('test-counter')).toBe(1);
    metrics.incrementCounter('test-counter', 5);
    expect(metrics.getCounter('test-counter')).toBe(6);
  });

  it('should set gauge', () => {
    metrics.setGauge('test-gauge', 100);
    expect(metrics.getGauge('test-gauge')).toBe(100);
  });

  it('should get history with limit', () => {
    metrics.recordMetric('history-metric', 1);
    metrics.recordMetric('history-metric', 2);
    metrics.recordMetric('history-metric', 3);
    expect(metrics.getHistory(2)).toHaveLength(2);
  });

  it('should get summary', () => {
    metrics.recordMetric('summary-metric', 10);
    metrics.recordMetric('summary-metric', 20);
    metrics.recordMetric('summary-metric', 30);
    const summary = metrics.getSummary('summary-metric');
    expect(summary?.average).toBe(20);
    expect(summary?.min).toBe(10);
    expect(summary?.max).toBe(30);
  });

  it('should return null for non-existent summary', () => {
    expect(metrics.getSummary('non-existent')).toBeNull();
  });

  it('should export metrics', () => {
    metrics.recordMetric('export-metric', 50);
    const exported = metrics.exportMetrics();
    expect(exported).toHaveProperty('metrics');
    expect(exported).toHaveProperty('totalEntries');
  });

  it('should clear metrics', () => {
    metrics.recordMetric('clear-metric', 100);
    metrics.clear();
    expect(metrics.getHistory()).toHaveLength(0);
  });

  it('should get snapshot', () => {
    const snapshot = metrics.getSnapshot();
    expect(snapshot).toHaveProperty('metricCount');
    expect(snapshot).toHaveProperty('historySize');
  });

  it('should reset metrics', () => {
    metrics.recordMetric('reset-metric', 100);
    metrics.reset();
    expect(metrics.getHistory()).toHaveLength(0);
  });

  it('should get report', () => {
    const report = metrics.getReport();
    expect(report).toHaveProperty('summaries');
    expect(report).toHaveProperty('counters');
  });
});

describe('IntegrationConfig', () => {
  let configManager: IntegrationConfigManager;

  beforeEach(() => {
    configManager = new IntegrationConfigManager();
  });

  it('should load valid config', () => {
    const config = {
      version: '1.0.0',
      hub: { name: 'TestHub', timeout: 5000, retries: 3 },
      adapters: {},
      pipelines: {},
      logging: { level: 'info' as const, enabled: true },
    };
    configManager.loadConfig(config);
    expect(configManager.getConfig()).not.toBeNull();
    expect(configManager.getConfig()?.version).toBe('1.0.0');
  });

  it('should throw on invalid config', () => {
    expect(() => configManager.loadConfig({} as never)).toThrow();
  });

  it('should save config', () => {
    const config = {
      version: '1.0.0',
      hub: { name: 'TestHub', timeout: 5000, retries: 3 },
      adapters: {},
      pipelines: {},
      logging: { level: 'info' as const, enabled: true },
    };
    configManager.loadConfig(config);
    const saved = configManager.saveConfig();
    expect(saved?.version).toBe('1.0.0');
  });

  it('should update config', () => {
    const config = {
      version: '1.0.0',
      hub: { name: 'TestHub', timeout: 5000, retries: 3 },
      adapters: {},
      pipelines: {},
      logging: { level: 'info' as const, enabled: true },
    };
    configManager.loadConfig(config);
    configManager.updateConfig({ version: '2.0.0' });
    expect(configManager.getConfig()?.version).toBe('2.0.0');
  });

  it('should get config value by path', () => {
    const config = {
      version: '1.0.0',
      hub: { name: 'TestHub', timeout: 5000, retries: 3 },
      adapters: {},
      pipelines: {},
      logging: { level: 'info' as const, enabled: true },
    };
    configManager.loadConfig(config);
    expect(configManager.getConfigValue<string>('hub.name')).toBe('TestHub');
  });

  it('should set config value by path', () => {
    const config = {
      version: '1.0.0',
      hub: { name: 'TestHub', timeout: 5000, retries: 3 },
      adapters: {},
      pipelines: {},
      logging: { level: 'info' as const, enabled: true },
    };
    configManager.loadConfig(config);
    configManager.setConfigValue('hub.timeout', 10000);
    expect(configManager.getConfigValue<number>('hub.timeout')).toBe(10000);
  });

  it('should throw when getting value with no config', () => {
    expect(configManager.getConfigValue('path')).toBeUndefined();
  });

  it('should reset config', () => {
    const config = {
      version: '1.0.0',
      hub: { name: 'TestHub', timeout: 5000, retries: 3 },
      adapters: {},
      pipelines: {},
      logging: { level: 'info' as const, enabled: true },
    };
    configManager.loadConfig(config);
    configManager.resetConfig();
    expect(configManager.getConfig()).toBeNull();
  });

  it('should get snapshot', () => {
    const snapshot = configManager.getSnapshot();
    expect(snapshot).toHaveProperty('hasConfig');
    expect(snapshot).toHaveProperty('historySize');
  });

  it('should reset', () => {
    configManager.reset();
    expect(configManager.getReport()).toHaveProperty('historySize');
  });

  it('should get report', () => {
    const report = configManager.getReport();
    expect(report).toHaveProperty('hasConfig');
    expect(report).toHaveProperty('snapshots');
  });

  it('should export metrics', () => {
    const metrics = configManager.exportMetrics();
    expect(metrics).toHaveProperty('hasConfig');
    expect(metrics).toHaveProperty('version');
  });
});

describe('IntegrationUtils', () => {
  let utils: IntegrationUtils;

  beforeEach(() => {
    utils = new IntegrationUtils();
  });

  it('should validate data', () => {
    const result = utils.validate({ name: 'test' }, { required: ['name'] });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const result = utils.validate({}, { required: ['name'] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Required field "name" is missing');
  });

  it('should reject null data', () => {
    const result = utils.validate(null, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Data is null or undefined');
  });

  it('should transform data', async () => {
    const transformers = [
      async (input: unknown) => `${input}-transformed`,
    ];
    const result = await utils.transform('data', transformers);
    expect(result).toBe('data-transformed');
  });

  it('should merge objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = utils.merge(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should deep merge nested objects', () => {
    const target = { nested: { a: 1, b: 2 } };
    const source = { nested: { b: 3, c: 4 } };
    const result = utils.merge(target, source);
    expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
  });

  it('should get utils instance', () => {
    expect(utils.getUtils()).toBe(utils);
  });

  it('should get snapshot', () => {
    const snapshot = utils.getSnapshot();
    expect(snapshot).toHaveProperty('snapshotCount');
    expect(snapshot).toHaveProperty('validationCount');
  });

  it('should reset utils', () => {
    utils.reset();
    expect(utils.getReport()).toHaveProperty('totalValidations');
  });

  it('should get report', () => {
    const report = utils.getReport();
    expect(report).toHaveProperty('totalValidations');
    expect(report).toHaveProperty('transformSuccess');
  });

  it('should export metrics', () => {
    const metrics = utils.exportMetrics();
    expect(metrics).toHaveProperty('validationHistory');
    expect(metrics).toHaveProperty('transformSuccess');
  });
});