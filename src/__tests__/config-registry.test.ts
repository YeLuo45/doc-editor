/**
 * config-registry.test.ts
 * V79 Config Registry Tests - 27+ test cases
 */

import {
  ConfigRegistry,
  ConfigValidator,
  ConfigWatcher,
  ConfigExporter,
} from '../config-registry';

describe('ConfigRegistry', () => {
  let registry: ConfigRegistry;

  beforeEach(() => {
    registry = new ConfigRegistry();
  });

  test('should register a new config key', () => {
    expect(registry.register('theme', 'dark')).toBe(true);
    expect(registry.get('theme')).toBe('dark');
  });

  test('should not register duplicate key', () => {
    registry.register('theme', 'dark');
    expect(registry.register('theme', 'light')).toBe(false);
  });

  test('should unregister existing key', () => {
    registry.register('theme', 'dark');
    expect(registry.unregister('theme')).toBe(true);
    expect(registry.get('theme')).toBeUndefined();
  });

  test('should not unregister non-existent key', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  test('should get all configs', () => {
    registry.register('theme', 'dark');
    registry.register('language', 'en');
    const all = registry.getAll();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all.theme).toBe('dark');
    expect(all.language).toBe('en');
  });

  test('should set and update config', () => {
    registry.register('theme', 'dark');
    registry.set('theme', 'light');
    expect(registry.get('theme')).toBe('light');
  });

  test('should get snapshot with metrics', () => {
    registry.register('theme', 'dark');
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.totalKeys).toBe(1);
    expect(snapshot.metrics.operationCount).toBeGreaterThan(0);
  });

  test('should reset all configs', () => {
    registry.register('theme', 'dark');
    registry.reset();
    expect(registry.getAll()).toEqual({});
  });

  test('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toContain('V79');
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('ConfigRegistry Report');
    expect(report).toContain('Registered Keys');
  });
});

describe('ConfigValidator', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  test('should add and get schema', () => {
    validator.addSchema('theme', { type: 'string', required: true });
    const schema = validator.getSchema('theme');
    expect(schema?.type).toBe('string');
    expect(schema?.required).toBe(true);
  });

  test('should validate correct data', () => {
    validator.addSchema('theme', { type: 'string' });
    const result = validator.validate({ theme: 'dark' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should catch type mismatch', () => {
    validator.addSchema('theme', { type: 'string' });
    const result = validator.validate({ theme: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('TYPE_MISMATCH');
  });

  test('should catch required field missing', () => {
    validator.addSchema('theme', { type: 'string', required: true });
    const result = validator.validate({});
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING');
  });

  test('should apply defaults', () => {
    validator.addSchema('theme', { type: 'string', default: 'dark' });
    const applied = validator.apply({});
    expect(applied.theme).toBe('dark');
  });

  test('should get errors', () => {
    validator.addSchema('count', { type: 'number' });
    validator.validate({ count: 'not-a-number' });
    const errors = validator.getErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should remove schema', () => {
    validator.addSchema('theme', { type: 'string' });
    expect(validator.removeSchema('theme')).toBe(true);
    expect(validator.getSchema('theme')).toBeUndefined();
  });

  test('should reset validator', () => {
    validator.addSchema('theme', { type: 'string' });
    validator.reset();
    expect(validator.getSchema('theme')).toBeUndefined();
  });

  test('should export metrics', () => {
    const metrics = validator.exportMetrics();
    expect(metrics.version).toContain('V79');
  });

  test('should get report', () => {
    const report = validator.getReport();
    expect(report).toContain('ConfigValidator Report');
  });
});

describe('ConfigWatcher', () => {
  let watcher: ConfigWatcher;

  beforeEach(() => {
    watcher = new ConfigWatcher();
  });

  test('should watch a key', () => {
    const callback = vi.fn();
    watcher.watch('theme', callback);
    const watched = watcher.getWatched();
    expect(watched).toContain('theme');
  });

  test('should unwatch a key', () => {
    const callback = vi.fn();
    watcher.watch('theme', callback);
    watcher.unwatch('theme');
    expect(watcher.getWatched()).not.toContain('theme');
  });

  test('should unwatch specific callback', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    watcher.watch('theme', cb1);
    watcher.watch('theme', cb2);
    watcher.unwatch('theme', cb1);
    const info = watcher.getWatchedInfo();
    expect(info[0].callbackCount).toBe(1);
  });

  test('should trigger callback on value change', () => {
    const callback = vi.fn();
    watcher.watch('theme', callback);
    watcher.check('theme', 'dark');
    expect(callback).toHaveBeenCalledWith('theme', undefined, 'dark');
  });

  test('should not trigger callback on same value', () => {
    const callback = vi.fn();
    watcher.watch('theme', callback);
    watcher.check('theme', 'dark');
    watcher.check('theme', 'dark');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('should check if key is watched', () => {
    watcher.watch('theme', vi.fn());
    const watched = watcher.getWatched();
    expect(watched).toContain('theme');
  });

  test('should get watched info', () => {
    watcher.watch('theme', vi.fn());
    const info = watcher.getWatchedInfo();
    expect(info[0].key).toBe('theme');
  });

  test('should get snapshot metrics', () => {
    const snapshot = watcher.getSnapshot();
    expect(snapshot.metrics.watchedCount).toBe(0);
  });

  test('should reset watcher', () => {
    watcher.watch('theme', vi.fn());
    watcher.reset();
    expect(watcher.getWatched()).toEqual([]);
  });

  test('should export metrics', () => {
    const metrics = watcher.exportMetrics();
    expect(metrics.version).toContain('V79');
  });
});

describe('ConfigExporter', () => {
  let exporter: ConfigExporter;

  beforeEach(() => {
    exporter = new ConfigExporter();
  });

  test('should export config as string', () => {
    const data = { theme: 'dark', language: 'en' };
    const exported = exporter.export(data);
    expect(typeof exported).toBe('string');
    expect(exported).toContain('theme');
  });

  test('should import valid export', () => {
    const data = { theme: 'dark', language: 'en' };
    const exported = exporter.export(data);
    const imported = exporter.import(exported);
    expect(imported).toEqual(data);
  });

  test('should return null for invalid import', () => {
    const imported = exporter.import('invalid-json');
    expect(imported).toBeNull();
  });

  test('should create snapshot', () => {
    const data = { theme: 'dark' };
    const snapshot = exporter.snapshot(data);
    expect(snapshot.version).toContain('V79');
    expect(snapshot.checksum).toBeDefined();
  });

  test('should restore valid snapshot', () => {
    const data = { theme: 'dark' };
    const snapshot = exporter.snapshot(data);
    const restored = exporter.restore(snapshot);
    expect(restored).toEqual(data);
  });

  test('should return null for tampered snapshot', () => {
    const data = { theme: 'dark' };
    const snapshot = exporter.snapshot(data);
    snapshot.data.theme = 'tampered';
    const restored = exporter.restore(snapshot);
    expect(restored).toBeNull();
  });

  test('should track history', () => {
    const data = { theme: 'dark' };
    exporter.export(data);
    const history = exporter.getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].action).toBe('export');
  });

  test('should clear history', () => {
    exporter.export({ theme: 'dark' });
    exporter.clearHistory();
    expect(exporter.getHistory()).toEqual([]);
  });

  test('should get snapshot metrics', () => {
    const snapshot = exporter.getSnapshot();
    expect(snapshot.metrics.exportCount).toBe(0);
  });

  test('should reset exporter', () => {
    exporter.export({ theme: 'dark' });
    exporter.reset();
    expect(exporter.getHistory()).toEqual([]);
  });

  test('should export metrics', () => {
    const metrics = exporter.exportMetrics();
    expect(metrics.version).toContain('V79');
  });
});