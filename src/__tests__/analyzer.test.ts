/**
 * V134 Analyzer Tests
 * Tests for Analyzer, AnalyzerRegistry, AnalyzerExecutor, and AnalyzerMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Analyzer, AnalyzerConfig, Rule } from '../analyzer/Analyzer.js';
import { AnalyzerRegistry, RegistryConfig } from '../analyzer/AnalyzerRegistry.js';
import { AnalyzerExecutor, ExecutorConfig } from '../analyzer/AnalyzerExecutor.js';
import { AnalyzerMonitor, MonitorConfig } from '../analyzer/AnalyzerMonitor.js';

describe('Analyzer', () => {
  let analyzer: Analyzer;
  let config: AnalyzerConfig;

  beforeEach(() => {
    config = { enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 };
    analyzer = new Analyzer(config);
  });

  it('should create analyzer with correct config', () => {
    expect(analyzer.config).toEqual(config);
    expect(analyzer.config.enabled).toBe(true);
  });

  it('should analyze content and return results', () => {
    analyzer.addRule({
      id: 'rule1',
      name: 'Test Rule',
      severity: 'medium',
      check: (content) => content.length > 0,
    });
    const results = analyzer.analyze('test content');
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });

  it('should add and remove rules', () => {
    const rule: Rule = { id: 'rule1', name: 'Test', severity: 'low', check: () => true };
    analyzer.addRule(rule);
    expect(analyzer.getStats().rulesCount).toBe(1);
    expect(analyzer.removeRule('rule1')).toBe(true);
    expect(analyzer.getStats().rulesCount).toBe(0);
  });

  it('should throw when adding duplicate rule', () => {
    const rule: Rule = { id: 'rule1', name: 'Test', severity: 'low', check: () => true };
    analyzer.addRule(rule);
    expect(() => analyzer.addRule(rule)).toThrow();
  });

  it('should return false when removing non-existent rule', () => {
    expect(analyzer.removeRule('nonexistent')).toBe(false);
  });

  it('should getAnalyzer return instance', () => {
    expect(analyzer.getAnalyzer()).toBe(analyzer);
  });

  it('should return correct stats', () => {
    analyzer.addRule({ id: 'r1', name: 'R1', severity: 'low', check: () => true });
    analyzer.analyze('test');
    const stats = analyzer.getStats();
    expect(stats.totalAnalyzed).toBe(1);
    expect(stats.rulesCount).toBe(1);
    expect(stats.lastAnalyzedAt).not.toBeNull();
  });

  it('should return snapshot with correct structure', () => {
    const snapshot = analyzer.getSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('config');
    expect(snapshot).toHaveProperty('stats');
  });

  it('should reset stats and rules', () => {
    analyzer.addRule({ id: 'r1', name: 'R1', severity: 'low', check: () => true });
    analyzer.analyze('test');
    analyzer.reset();
    const stats = analyzer.getStats();
    expect(stats.totalAnalyzed).toBe(0);
    expect(stats.rulesCount).toBe(0);
    expect(stats.lastAnalyzedAt).toBeNull();
  });

  it('should generate report with version', () => {
    const report = analyzer.getReport();
    expect(report).toContain('V134');
  });

  it('should export metrics with version', () => {
    const metrics = analyzer.exportMetrics();
    expect(metrics.version).toBe('V134');
    expect(metrics).toHaveProperty('stats');
  });
});

describe('AnalyzerRegistry', () => {
  let registry: AnalyzerRegistry;
  let config: RegistryConfig;

  beforeEach(() => {
    config = { maxAnalyzers: 10, allowDuplicate: false };
    registry = new AnalyzerRegistry(config);
  });

  it('should create registry with correct config', () => {
    expect(registry.config).toEqual(config);
  });

  it('should register and retrieve analyzer', () => {
    const analyzer = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    expect(registry.register('test', analyzer)).toBe(true);
    expect(registry.get('test')).toBe(analyzer);
  });

  it('should check if analyzer exists', () => {
    const analyzer = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    registry.register('test', analyzer);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should return all analyzers', () => {
    const a1 = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    const a2 = new Analyzer({ enabled: false, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    registry.register('a1', a1);
    registry.register('a2', a2);
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should unregister analyzer', () => {
    const analyzer = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    registry.register('test', analyzer);
    expect(registry.unregister('test')).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  it('should throw when registry full', () => {
    const smallConfig = { maxAnalyzers: 1, allowDuplicate: false };
    const smallRegistry = new AnalyzerRegistry(smallConfig);
    const a1 = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    const a2 = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    smallRegistry.register('a1', a1);
    expect(() => smallRegistry.register('a2', a2)).toThrow();
  });

  it('should return snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('config');
    expect(snapshot).toHaveProperty('stats');
  });

  it('should reset registry', () => {
    const analyzer = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    registry.register('test', analyzer);
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V134');
  });
});

describe('AnalyzerExecutor', () => {
  let registry: AnalyzerRegistry;
  let executor: AnalyzerExecutor;
  let executorConfig: ExecutorConfig;

  beforeEach(() => {
    const regConfig = { maxAnalyzers: 10, allowDuplicate: false };
    registry = new AnalyzerRegistry(regConfig);
    executorConfig = { concurrency: 5, stopOnError: false, timeout: 5000 };
    executor = new AnalyzerExecutor(executorConfig, registry);
  });

  it('should create executor with config', () => {
    expect(executor.config).toEqual(executorConfig);
  });

  it('should execute on all registered analyzers', () => {
    const analyzer = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    analyzer.addRule({ id: 'r1', name: 'R1', severity: 'low', check: () => true });
    registry.register('test', analyzer);
    const results = executor.execute('test content');
    expect(results.size).toBeGreaterThan(0);
  });

  it('should run and return execution results', async () => {
    const analyzer = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    analyzer.addRule({ id: 'r1', name: 'R1', severity: 'low', check: () => true });
    registry.register('test', analyzer);
    const results = await executor.run('test content', ['test']);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  it('should track success and failure counts', async () => {
    const a1 = new Analyzer({ enabled: true, threshold: 0.5, maxDepth: 10, timeout: 5000 });
    a1.addRule({ id: 'r1', name: 'R1', severity: 'low', check: () => true });
    registry.register('a1', a1);
    await executor.run('content', ['a1']);
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBeGreaterThan(0);
  });

  it('should return all results', () => {
    const results = executor.getResults();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('config');
    expect(snapshot).toHaveProperty('stats');
  });

  it('should reset executor', () => {
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(0);
  });
});

describe('AnalyzerMonitor', () => {
  let monitor: AnalyzerMonitor;
  let config: MonitorConfig;

  beforeEach(() => {
    config = { maxHistorySize: 100, metricsInterval: 1000, healthCheckEnabled: true };
    monitor = new AnalyzerMonitor(config);
  });

  it('should create monitor with config', () => {
    expect(monitor.config).toEqual(config);
  });

  it('should track metrics', () => {
    monitor.track('analyzer1', 'latency', 100);
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].analyzerName).toBe('analyzer1');
  });

  it('should get metrics for specific analyzer', () => {
    monitor.track('analyzer1', 'latency', 100);
    monitor.track('analyzer2', 'latency', 200);
    const metrics = monitor.getMetrics('analyzer1');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(100);
  });

  it('should return history', () => {
    monitor.track('a1', 'metric1', 50);
    const history = monitor.getHistory();
    expect(history).toHaveLength(1);
  });

  it('should return health status', () => {
    monitor.track('a1', 'latency', 100);
    const status = monitor.getStatus();
    expect(status).toHaveProperty('healthy');
    expect(status).toHaveProperty('lastCheck');
  });

  it('should return snapshot', () => {
    monitor.track('a1', 'latency', 100);
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('config');
    expect(snapshot).toHaveProperty('stats');
  });

  it('should reset monitor', () => {
    monitor.track('a1', 'latency', 100);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(0);
  });

  it('should generate report', () => {
    monitor.track('a1', 'latency', 100);
    const report = monitor.getReport();
    expect(report).toContain('V134');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V134');
    expect(metrics).toHaveProperty('stats');
  });
});