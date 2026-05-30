/**
 * V123 Decoder Test Suite
 * Tests for Decoder, DecoderRegistry, DecoderExecutor, DecoderMonitor
 */

import { Decoder } from '../decoder/Decoder';
import { DecoderRegistry } from '../decoder/DecoderRegistry';
import { DecoderExecutor } from '../decoder/DecoderExecutor';
import { DecoderMonitor } from '../decoder/DecoderMonitor';

describe('V123 Decoder Module Tests', () => {
  describe('Decoder', () => {
    test('should create decoder with default config', () => {
      const decoder = new Decoder('test-decoder');
      expect(decoder.name).toBe('test-decoder');
      expect(decoder.active).toBe(true);
      expect(decoder.stats.totalDecodes).toBe(0);
    });

    test('should create decoder with custom config', () => {
      const decoder = new Decoder('custom', { enabled: false, timeout: 10000 });
      expect(decoder.config.enabled).toBe(false);
      expect(decoder.config.timeout).toBe(10000);
    });

    test('should decode string data', () => {
      const decoder = new Decoder('string-test');
      const result = decoder.decode('{"key":"value"}');
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ key: 'value' });
    });

    test('should decode object data', () => {
      const decoder = new Decoder('object-test');
      const result = decoder.decode({ type: 'test', data: 123 });
      expect(result.success).toBe(true);
      expect(result.result).toMatchObject({ type: 'test', data: 123, decoded: true });
    });

    test('should reject decoding when disabled', () => {
      const decoder = new Decoder('disabled-test', { enabled: false });
      const result = decoder.decode('test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Decoder is disabled');
    });

    test('should track decode statistics', () => {
      const decoder = new Decoder('stats-test');
      decoder.decode('test1');
      decoder.decode('test2');
      expect(decoder.stats.totalDecodes).toBe(2);
      expect(decoder.stats.successfulDecodes).toBe(2);
    });

    test('should get decoder identifier', () => {
      const decoder = new Decoder('id-test');
      expect(decoder.getDecoder()).toBe('Decoder:id-test:v1.2.3');
    });

    test('should get snapshot with metrics', () => {
      const decoder = new Decoder('snapshot-test');
      const snapshot = decoder.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('config');
      expect(snapshot.metrics).toHaveProperty('stats');
      expect(snapshot.metrics).toHaveProperty('active');
    });

    test('should reset statistics', () => {
      const decoder = new Decoder('reset-test');
      decoder.decode('test');
      decoder.reset();
      expect(decoder.stats.totalDecodes).toBe(0);
      expect(decoder.stats.successfulDecodes).toBe(0);
    });

    test('should generate report', () => {
      const decoder = new Decoder('report-test');
      const report = decoder.getReport();
      expect(report).toContain('Decoder Report: report-test');
      expect(report).toContain('Total: 0');
    });

    test('should export metrics', () => {
      const decoder = new Decoder('export-test');
      const metrics = decoder.exportMetrics();
      expect(metrics.version).toBe('1.2.3');
      expect(metrics).toHaveProperty('decoderName');
      expect(metrics).toHaveProperty('metrics');
    });
  });

  describe('DecoderRegistry', () => {
    test('should create empty registry', () => {
      const registry = new DecoderRegistry();
      expect(registry.size).toBe(0);
      expect(registry.getNames()).toEqual([]);
    });

    test('should register decoder', () => {
      const registry = new DecoderRegistry();
      const decoder = registry.register('reg-test');
      expect(decoder).toBeInstanceOf(Decoder);
      expect(registry.has('reg-test')).toBe(true);
    });

    test('should unregister decoder', () => {
      const registry = new DecoderRegistry();
      registry.register('unreg-test');
      expect(registry.unregister('unreg-test')).toBe(true);
      expect(registry.has('unreg-test')).toBe(false);
    });

    test('should get registered decoder', () => {
      const registry = new DecoderRegistry();
      registry.register('get-test');
      const decoder = registry.get('get-test');
      expect(decoder).toBeInstanceOf(Decoder);
      expect(decoder?.name).toBe('get-test');
    });

    test('should get all decoders', () => {
      const registry = new DecoderRegistry();
      registry.register('all-1');
      registry.register('all-2');
      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    test('should throw on duplicate registration', () => {
      const registry = new DecoderRegistry();
      registry.register('dup-test');
      expect(() => registry.register('dup-test')).toThrow();
    });

    test('should clear all decoders', () => {
      const registry = new DecoderRegistry();
      registry.register('clear-1');
      registry.register('clear-2');
      registry.clear();
      expect(registry.size).toBe(0);
    });

    test('should get snapshot', () => {
      const registry = new DecoderRegistry();
      registry.register('snap-test');
      const snapshot = registry.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('registeredDecoders');
      expect(snapshot.metrics.totalDecoders).toBe(1);
    });

    test('should generate registry report', () => {
      const registry = new DecoderRegistry();
      registry.register('report-reg');
      const report = registry.getReport();
      expect(report).toContain('Decoder Registry Report');
      expect(report).toContain('report-reg');
    });

    test('should export registry metrics', () => {
      const registry = new DecoderRegistry();
      const metrics = registry.exportMetrics();
      expect(metrics.version).toBe('1.2.3');
      expect(metrics).toHaveProperty('registry');
    });
  });

  describe('DecoderExecutor', () => {
    let registry: DecoderRegistry;

    beforeEach(() => {
      registry = new DecoderRegistry();
      registry.register('exec-test-1');
      registry.register('exec-test-2');
    });

    test('should create executor with registry', () => {
      const executor = new DecoderExecutor(registry);
      expect(executor).toBeInstanceOf(DecoderExecutor);
      expect(executor.active).toBe(true);
    });

    test('should execute on registered decoder', () => {
      const executor = new DecoderExecutor(registry);
      const result = executor.execute('exec-test-1', 'test data');
      expect(result.success).toBe(true);
      expect(result.decoderName).toBe('exec-test-1');
    });

    test('should fail on unregistered decoder', () => {
      const executor = new DecoderExecutor(registry);
      const result = executor.execute('nonexistent', 'test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should run sequential execution', () => {
      const executor = new DecoderExecutor(registry, { parallel: false });
      const results = executor.run(['exec-test-1', 'exec-test-2'], 'test');
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
    });

    test('should track execution stats', () => {
      const executor = new DecoderExecutor(registry);
      executor.execute('exec-test-1', 'test');
      expect(executor.stats.totalExecutions).toBe(1);
      expect(executor.stats.successfulExecutions).toBe(1);
    });

    test('should get execution results', () => {
      const executor = new DecoderExecutor(registry);
      executor.execute('exec-test-1', 'test');
      const results = executor.getResults();
      expect(results).toHaveLength(1);
    });

    test('should get results by decoder', () => {
      const executor = new DecoderExecutor(registry);
      executor.execute('exec-test-1', 'test1');
      executor.execute('exec-test-1', 'test2');
      const results = executor.getResultsByDecoder('exec-test-1');
      expect(results).toHaveLength(2);
    });

    test('should get executor snapshot', () => {
      const executor = new DecoderExecutor(registry);
      const snapshot = executor.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('config');
      expect(snapshot.metrics).toHaveProperty('stats');
    });

    test('should reset executor', () => {
      const executor = new DecoderExecutor(registry);
      executor.execute('exec-test-1', 'test');
      executor.reset();
      expect(executor.stats.totalExecutions).toBe(0);
      expect(executor.getResults()).toHaveLength(0);
    });
  });

  describe('DecoderMonitor', () => {
    let registry: DecoderRegistry;
    let executor: DecoderExecutor;
    let monitor: DecoderMonitor;

    beforeEach(() => {
      registry = new DecoderRegistry();
      registry.register('mon-test');
      executor = new DecoderExecutor(registry);
      monitor = new DecoderMonitor(executor);
    });

    test('should create monitor', () => {
      expect(monitor).toBeInstanceOf(DecoderMonitor);
      expect(monitor.status).toBe('idle');
    });

    test('should track execution result', () => {
      const result = executor.execute('mon-test', 'data');
      monitor.trackResult(result);
      expect(monitor.metrics.totalTracked).toBe(1);
      expect(monitor.metrics.successCount).toBe(1);
    });

    test('should get metrics', () => {
      const result = executor.execute('mon-test', 'data');
      monitor.trackResult(result);
      const metrics = monitor.getMetrics();
      expect(metrics.totalTracked).toBe(1);
    });

    test('should get history', () => {
      const result = executor.execute('mon-test', 'data');
      monitor.trackResult(result);
      const history = monitor.getHistory();
      expect(history).toHaveLength(1);
    });

    test('should get status', () => {
      const status = monitor.getStatus();
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('trackedDecoders');
    });

    test('should pause and resume', () => {
      monitor.pause();
      expect(monitor.status).toBe('paused');
      monitor.resume();
      expect(monitor.status).toBe('idle');
    });

    test('should get monitor snapshot', () => {
      const snapshot = monitor.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('config');
      expect(snapshot.metrics).toHaveProperty('metrics');
    });

    test('should reset monitor', () => {
      const result = executor.execute('mon-test', 'data');
      monitor.trackResult(result);
      monitor.reset();
      expect(monitor.metrics.totalTracked).toBe(0);
      expect(monitor.history).toHaveLength(0);
    });

    test('should generate monitor report', () => {
      const report = monitor.getReport();
      expect(report).toContain('Decoder Monitor Report');
      expect(report).toContain('Tracked: 0');
    });

    test('should export monitor metrics', () => {
      const metrics = monitor.exportMetrics();
      expect(metrics.version).toBe('1.2.3');
      expect(metrics).toHaveProperty('monitor');
    });
  });
});