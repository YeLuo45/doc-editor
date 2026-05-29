/**
 * logger-engine.test.ts - V87 Logger Engine Tests (27+ tests)
 */

import { LoggerEngine } from '../logger-engine/LoggerEngine';
import { LogFormatter } from '../logger-engine/LogFormatter';
import { LogStorage } from '../logger-engine/LogStorage';
import { LogMonitor } from '../logger-engine/LogMonitor';

describe('LoggerEngine', () => {
  let logger: LoggerEngine;

  beforeEach(() => {
    logger = new LoggerEngine({
      minLevel: 'debug',
      maxBufferSize: 10,
      flushInterval: 1000,
      enableConsole: false,
      enableRemote: false,
      format: 'json',
      tags: ['test']
    });
  });

  test('should create LoggerEngine with config', () => {
    expect(logger.config.minLevel).toBe('debug');
    expect(logger.config.maxBufferSize).toBe(10);
  });

  test('should log messages at different levels', () => {
    expect(logger.debug('debug message')).toBe(true);
    expect(logger.info('info message')).toBe(true);
    expect(logger.warn('warn message')).toBe(true);
    expect(logger.error('error message')).toBe(true);
    expect(logger.fatal('fatal message')).toBe(true);
  });

  test('should not log below minLevel', () => {
    const errorLogger = new LoggerEngine({
      minLevel: 'error',
      maxBufferSize: 10,
      flushInterval: 1000,
      enableConsole: false,
      enableRemote: false,
      format: 'json'
    });
    expect(errorLogger.debug('should not log')).toBe(false);
    expect(errorLogger.info('should not log')).toBe(false);
  });

  test('should flush buffer and return entries', () => {
    logger.info('message 1');
    logger.info('message 2');
    const flushed = logger.flush();
    expect(flushed.length).toBe(2);
    expect(logger.getStats().bufferSize).toBe(0);
  });

  test('should get current level', () => {
    expect(logger.getLevel()).toBe('debug');
  });

  test('should track statistics', () => {
    logger.info('test1');
    logger.info('test2');
    logger.error('test3');
    const stats = logger.getStats();
    expect(stats.totalLogs).toBe(3);
    expect(stats.logsByLevel.info).toBe(2);
    expect(stats.logsByLevel.error).toBe(1);
  });

  test('should get snapshot with metrics', () => {
    logger.info('test message');
    const snapshot = logger.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalLogs).toBe(1);
  });

  test('should reset all stats and buffer', () => {
    logger.info('test');
    logger.reset();
    const stats = logger.getStats();
    expect(stats.totalLogs).toBe(0);
    expect(stats.bufferSize).toBe(0);
  });

  test('should export metrics with version', () => {
    const metrics = logger.exportMetrics();
    expect(metrics.version).toBe('V87-1.0.0');
  });

  test('should generate report string', () => {
    logger.info('test');
    const report = logger.getReport();
    expect(report).toContain('LoggerEngine Report');
    expect(report).toContain('Total Logs: 1');
  });
});

describe('LogFormatter', () => {
  let formatter: LogFormatter;

  beforeEach(() => {
    formatter = new LogFormatter({
      defaultFormat: 'json',
      timestampFormat: 'ISO',
      includeMetadata: true
    });
  });

  test('should create LogFormatter with config', () => {
    expect(formatter.config.defaultFormat).toBe('json');
    expect(formatter.config.includeMetadata).toBe(true);
  });

  test('should format log entry as JSON', () => {
    const entry = { level: 'info', timestamp: Date.now(), message: 'test message' };
    const formatted = formatter.format(entry);
    expect(formatted).toContain('"level":"info"');
    expect(formatted).toContain('"message":"test message"');
  });

  test('should format log entry as text', () => {
    const entry = { level: 'error', timestamp: Date.now(), message: 'error occurred' };
    const formatted = formatter.format(entry, 'text');
    expect(formatted).toContain('[ERROR]');
    expect(formatted).toContain('error occurred');
  });

  test('should format log entry as XML', () => {
    const entry = { level: 'warn', timestamp: Date.now(), message: 'warning' };
    const formatted = formatter.format(entry, 'xml');
    expect(formatted).toContain('<level>warn</level>');
    expect(formatted).toContain('<message>warning</message>');
  });

  test('should parse JSON formatted log', () => {
    const json = '{"level":"info","message":"test"}';
    const parsed = formatter.parse(json, 'json');
    expect(parsed?.level).toBe('info');
    expect(parsed?.message).toBe('test');
  });

  test('should track formatting statistics', () => {
    formatter.format({ level: 'info', timestamp: Date.now(), message: 'test' });
    const stats = formatter.getStats();
    expect(stats.totalFormatted).toBe(1);
    expect(stats.formatsUsed.json).toBe(1);
  });

  test('should get available formats', () => {
    const formats = formatter.getFormats();
    expect(formats.length).toBe(4);
  });

  test('should get snapshot with metrics', () => {
    formatter.format({ level: 'info', timestamp: Date.now(), message: 'test' });
    const snapshot = formatter.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset statistics', () => {
    formatter.format({ level: 'info', timestamp: Date.now(), message: 'test' });
    formatter.reset();
    const stats = formatter.getStats();
    expect(stats.totalFormatted).toBe(0);
  });

  test('should export metrics with version', () => {
    const metrics = formatter.exportMetrics();
    expect(metrics.version).toBe('V87-1.0.0');
  });

  test('should generate report string', () => {
    const report = formatter.getReport();
    expect(report).toContain('LogFormatter Report');
  });
});

describe('LogStorage', () => {
  let storage: LogStorage;

  beforeEach(() => {
    storage = new LogStorage({
      maxEntries: 100,
      retentionDays: 7,
      storageType: 'memory',
      compressionEnabled: false,
      autoCleanup: true
    });
  });

  test('should create LogStorage with config', () => {
    expect(storage.config.maxEntries).toBe(100);
    expect(storage.config.storageType).toBe('memory');
  });

  test('should store log entries', () => {
    const log = { id: '1', timestamp: Date.now(), level: 'info', message: 'test' };
    expect(storage.store(log)).toBe(true);
    expect(storage.getSize()).toBe(1);
  });

  test('should retrieve log by id', () => {
    const log = { id: 'test-id', timestamp: Date.now(), level: 'info', message: 'test' };
    storage.store(log);
    const retrieved = storage.retrieve('test-id');
    expect(retrieved?.id).toBe('test-id');
  });

  test('should return null for non-existent id', () => {
    const retrieved = storage.retrieve('non-existent');
    expect(retrieved).toBeNull();
  });

  test('should clear all logs', () => {
    storage.store({ id: '1', timestamp: Date.now(), level: 'info', message: 'test' });
    storage.store({ id: '2', timestamp: Date.now(), level: 'info', message: 'test2' });
    const cleared = storage.clear();
    expect(cleared).toBe(2);
    expect(storage.getSize()).toBe(0);
  });

  test('should get logs with optional filtering', () => {
    storage.store({ id: '1', timestamp: Date.now(), level: 'info', message: 'test' });
    storage.store({ id: '2', timestamp: Date.now(), level: 'error', message: 'error' });
    const allLogs = storage.getLogs();
    expect(allLogs.length).toBe(2);
    const errorLogs = storage.getLogs({ level: 'error' });
    expect(errorLogs.length).toBe(1);
  });

  test('should track storage statistics', () => {
    storage.store({ id: '1', timestamp: Date.now(), level: 'info', message: 'test' });
    storage.store({ id: '2', timestamp: Date.now(), level: 'info', message: 'test2' });
    const stats = storage.getStats();
    expect(stats.totalStored).toBe(2);
  });

  test('should get snapshot with metrics', () => {
    storage.store({ id: '1', timestamp: Date.now(), level: 'info', message: 'test' });
    const snapshot = storage.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset storage', () => {
    storage.store({ id: '1', timestamp: Date.now(), level: 'info', message: 'test' });
    storage.reset();
    expect(storage.getSize()).toBe(0);
  });

  test('should export metrics with version', () => {
    const metrics = storage.exportMetrics();
    expect(metrics.version).toBe('V87-1.0.0');
  });

  test('should generate report string', () => {
    const report = storage.getReport();
    expect(report).toContain('LogStorage Report');
  });

  test('should search logs by message content', () => {
    storage.store({ id: '1', timestamp: Date.now(), level: 'info', message: 'hello world' });
    storage.store({ id: '2', timestamp: Date.now(), level: 'info', message: 'foo bar' });
    const results = storage.search('hello');
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('hello');
  });
});

describe('LogMonitor', () => {
  let monitor: LogMonitor;

  beforeEach(() => {
    monitor = new LogMonitor({
      enabled: true,
      sampleRate: 1.0,
      alertThresholds: { errorRate: 0.5 },
      historySize: 100,
      monitoringInterval: 1000
    });
  });

  test('should create LogMonitor with config', () => {
    expect(monitor.config.enabled).toBe(true);
    expect(monitor.config.historySize).toBe(100);
  });

  test('should track log entries', () => {
    monitor.track({ level: 'info', message: 'test message' });
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
    expect(metrics.infoCount).toBe(1);
  });

  test('should track error counts', () => {
    monitor.track({ level: 'error', message: 'error 1' });
    monitor.track({ level: 'error', message: 'error 2' });
    const metrics = monitor.getMetrics();
    expect(metrics.errorCount).toBe(2);
  });

  test('should track response time', () => {
    monitor.track({ level: 'info', message: 'test', responseTime: 100 });
    monitor.track({ level: 'info', message: 'test', responseTime: 200 });
    const metrics = monitor.getMetrics();
    expect(metrics.avgResponseTime).toBe(150);
  });

  test('should get monitoring history', () => {
    monitor.track({ level: 'info', message: 'test1' });
    monitor.track({ level: 'error', message: 'test2' });
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  test('should filter history by level', () => {
    monitor.track({ level: 'info', message: 'info msg' });
    monitor.track({ level: 'error', message: 'error msg' });
    const errorHistory = monitor.getHistory({ level: 'error' });
    expect(errorHistory.length).toBe(1);
    expect(errorHistory[0].level).toBe('error');
  });

  test('should get monitor status', async () => {
    const status = monitor.getStatus();
    expect(status.isEnabled).toBe(true);
    expect(status.uptime).toBeGreaterThanOrEqual(0);
    // Trigger some activity before checking lastUpdate
    monitor.track({ level: 'info', message: 'test' });
    const status2 = monitor.getStatus();
    expect(status2.lastUpdate).toBeGreaterThan(0);
  });

  test('should get snapshot with metrics', () => {
    monitor.track({ level: 'info', message: 'test' });
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalTracked).toBe(1);
  });

  test('should reset monitor', () => {
    monitor.track({ level: 'info', message: 'test' });
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
    expect(metrics.errorCount).toBe(0);
  });

  test('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V87-1.0.0');
  });

  test('should generate report string', () => {
    monitor.track({ level: 'info', message: 'test' });
    const report = monitor.getReport();
    expect(report).toContain('LogMonitor Report');
    expect(report).toContain('Total Tracked: 1');
  });

  test('should calculate error rate', () => {
    monitor.track({ level: 'info', message: 'test' });
    monitor.track({ level: 'error', message: 'error' });
    expect(monitor.getErrorRate()).toBe(0.5);
  });

  test('should get and clear alerts', () => {
    monitor.track({ level: 'error', message: 'test' });
    monitor.track({ level: 'error', message: 'test' });
    monitor.track({ level: 'error', message: 'test' });
    monitor.track({ level: 'error', message: 'test' });
    const alerts = monitor.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    monitor.clearAlerts();
    expect(monitor.getAlerts().length).toBe(0);
  });
});
