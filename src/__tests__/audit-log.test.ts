/**
 * Audit Log System Tests - doc-editor V63
 * Comprehensive tests for AuditLogger, AuditPolicy, AuditArchiver, AuditReporter
 */

import { AuditLogger } from '../audit-log/AuditLogger';
import { AuditPolicy } from '../audit-log/AuditPolicy';
import { AuditArchiver, Archive } from '../audit-log/AuditArchiver';
import { AuditReporter } from '../audit-log/AuditReporter';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger({ maxEntries: 100, retentionDays: 30, minLevel: 'INFO' });
  });

  afterEach(() => {
    logger.reset();
  });

  test('should create logger with default config', () => {
    const defaultLogger = new AuditLogger();
    expect(defaultLogger.config.maxEntries).toBe(10000);
    expect(defaultLogger.config.retentionDays).toBe(90);
  });

  test('should create logger with custom config', () => {
    expect(logger.config.maxEntries).toBe(100);
    expect(logger.config.retentionDays).toBe(30);
    expect(logger.config.minLevel).toBe('INFO');
  });

  test('should log entries with all fields', () => {
    const id = logger.log('USER_LOGIN', {
      level: 'INFO',
      userId: 'user123',
      resourceType: 'session',
      resourceId: 'sess456',
      details: { browser: 'Chrome' },
      ipAddress: '192.168.1.1',
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  test('should log entries with default level', () => {
    const id = logger.log('TEST_ACTION');
    const entries = logger.getEntries();
    expect(entries[0].level).toBe('INFO');
  });

  test('should filter entries below minLevel', () => {
    logger.log('DEBUG_ACTION', { level: 'DEBUG' });
    const entries = logger.getEntries();
    expect(entries.length).toBe(0);
  });

  test('should query entries by date range', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const tomorrow = new Date(now.getTime() + 86400000);
    logger.log('ACTION1');
    const results = logger.query({ startDate: yesterday, endDate: tomorrow });
    expect(results.length).toBe(1);
  });

  test('should query entries by level', () => {
    logger.log('INFO_ACTION', { level: 'INFO' });
    logger.log('WARN_ACTION', { level: 'WARN' });
    const results = logger.query({ level: 'WARN' });
    expect(results.length).toBe(1);
    expect(results[0].action).toBe('WARN_ACTION');
  });

  test('should query entries by action', () => {
    logger.log('CREATE');
    logger.log('UPDATE');
    logger.log('DELETE');
    const results = logger.query({ action: 'UPDATE' });
    expect(results.length).toBe(1);
  });

  test('should query entries by userId', () => {
    logger.log('ACTION', { userId: 'user1' });
    logger.log('ACTION', { userId: 'user2' });
    const results = logger.query({ userId: 'user1' });
    expect(results.length).toBe(1);
  });

  test('should query entries by resourceType', () => {
    logger.log('READ', { resourceType: 'document' });
    logger.log('WRITE', { resourceType: 'file' });
    const results = logger.query({ resourceType: 'document' });
    expect(results.length).toBe(1);
  });

  test('should getEntries with limit and offset', () => {
    for (let i = 0; i < 10; i++) {
      logger.log(`ACTION_${i}`);
    }
    const entries = logger.getEntries(3, 2);
    expect(entries.length).toBe(3);
  });

  test('should getStats', () => {
    logger.log('INFO_ACTION', { level: 'INFO' });
    logger.log('WARN_ACTION', { level: 'WARN' });
    const stats = logger.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.entriesByLevel.INFO).toBe(1);
    expect(stats.entriesByLevel.WARN).toBe(1);
  });

  test('should getSnapshot', () => {
    logger.log('ACTION');
    const snapshot = logger.getSnapshot();
    expect(snapshot.metrics.totalEntries).toBe(1);
  });

  test('should reset', () => {
    logger.log('ACTION');
    logger.reset();
    const stats = logger.getStats();
    expect(stats.totalEntries).toBe(0);
  });

  test('should getReport', () => {
    logger.log('ACTION', { level: 'ERROR' });
    const report = logger.getReport();
    expect(report).toContain('Audit Logger Report');
    expect(report).toContain('Total Entries: 1');
  });

  test('should exportMetrics', () => {
    logger.log('ACTION');
    const metrics = logger.exportMetrics();
    expect(metrics.version).toBe('V63');
    expect(metrics.metrics.totalEntries).toBe(1);
  });
});

describe('AuditPolicy', () => {
  let policy: AuditPolicy;

  beforeEach(() => {
    policy = new AuditPolicy({ defaultEffect: 'LOG', maxRules: 100 });
  });

  afterEach(() => {
    policy.reset();
  });

  test('should create policy with default config', () => {
    const defaultPolicy = new AuditPolicy();
    expect(defaultPolicy.config.defaultEffect).toBe('LOG');
    expect(defaultPolicy.config.maxRules).toBe(1000);
  });

  test('should add rule', () => {
    const id = policy.addRule({
      name: 'Test Rule',
      resourceType: 'document',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    expect(id).toBeTruthy();
    const rules = policy.getRules();
    expect(rules.length).toBe(1);
  });

  test('should add multiple rules and respect priority', () => {
    policy.addRule({
      name: 'Low Priority',
      resourceType: 'document',
      action: 'read',
      conditions: {},
      effect: 'DENY',
      priority: 1,
      enabled: true,
    });
    policy.addRule({
      name: 'High Priority',
      resourceType: 'document',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 10,
      enabled: true,
    });
    const rules = policy.getRules();
    expect(rules[0].name).toBe('High Priority');
  });

  test('should remove rule', () => {
    const id = policy.addRule({
      name: 'Test Rule',
      resourceType: 'document',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    const removed = policy.removeRule(id);
    expect(removed).toBe(true);
    expect(policy.getRules().length).toBe(0);
  });

  test('should return false when removing non-existent rule', () => {
    const removed = policy.removeRule('non-existent-id');
    expect(removed).toBe(false);
  });

  test('should getRules with filters', () => {
    policy.addRule({
      name: 'Rule 1',
      resourceType: 'document',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    policy.addRule({
      name: 'Rule 2',
      resourceType: 'file',
      action: 'write',
      conditions: {},
      effect: 'DENY',
      priority: 1,
      enabled: true,
    });
    const docRules = policy.getRules({ resourceType: 'document' });
    expect(docRules.length).toBe(1);
  });

  test('should evaluate and return default effect for unknown resource', () => {
    const effect = policy.evaluate('unknown', 'action');
    expect(effect).toBe('LOG');
  });

  test('should evaluate and match rules', () => {
    policy.addRule({
      name: 'Deny Document Read',
      resourceType: 'document',
      action: 'read',
      conditions: {},
      effect: 'DENY',
      priority: 1,
      enabled: true,
    });
    const effect = policy.evaluate('document', 'read');
    expect(effect).toBe('DENY');
  });

  test('should evaluate with wildcard action', () => {
    policy.addRule({
      name: 'Allow All Documents',
      resourceType: 'document',
      action: '*',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    const effect = policy.evaluate('document', 'any-action');
    expect(effect).toBe('ALLOW');
  });

  test('should getSnapshot', () => {
    policy.addRule({
      name: 'Test',
      resourceType: 'doc',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    const snapshot = policy.getSnapshot();
    expect(snapshot.metrics.totalRules).toBe(1);
  });

  test('should reset', () => {
    policy.addRule({
      name: 'Test',
      resourceType: 'doc',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    policy.reset();
    expect(policy.getRules().length).toBe(0);
  });

  test('should getReport', () => {
    policy.addRule({
      name: 'Test',
      resourceType: 'doc',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    const report = policy.getReport();
    expect(report).toContain('Audit Policy Report');
    expect(report).toContain('Total Rules: 1');
  });

  test('should exportMetrics', () => {
    policy.addRule({
      name: 'Test',
      resourceType: 'doc',
      action: 'read',
      conditions: {},
      effect: 'ALLOW',
      priority: 1,
      enabled: true,
    });
    const metrics = policy.exportMetrics();
    expect(metrics.version).toBe('V63');
    expect(metrics.metrics.totalRules).toBe(1);
  });
});

describe('AuditArchiver', () => {
  let archiver: AuditArchiver;
  let logger: AuditLogger;

  beforeEach(() => {
    archiver = new AuditArchiver({
      maxArchives: 5,
      compressionEnabled: false,
    });
    logger = new AuditLogger();
  });

  afterEach(() => {
    archiver.reset();
    logger.reset();
  });

  test('should create archiver with default config', () => {
    const defaultArchiver = new AuditArchiver();
    expect(defaultArchiver.config.maxArchives).toBe(12);
    expect(defaultArchiver.config.compressionEnabled).toBe(true);
  });

  test('should archive entries', () => {
    logger.log('ACTION1');
    logger.log('ACTION2');
    const entries = logger.getEntries();
    const archiveId = archiver.archive(entries);
    expect(archiveId).toBeTruthy();
    const archives = archiver.getArchives();
    expect(archives.length).toBe(1);
  });

  test('should throw error when archiving empty entries', () => {
    expect(() => archiver.archive([])).toThrow('Cannot archive empty entries');
  });

  test('should compact archive', () => {
    logger.log('ACTION1');
    logger.log('ACTION2');
    const entries = logger.getEntries();
    const archiveId = archiver.archive(entries);
    const compacted = archiver.compact(archiveId);
    expect(compacted).toBe(true);
  });

  test('should get archive size', () => {
    logger.log('ACTION');
    const entries = logger.getEntries();
    const archiveId = archiver.archive(entries);
    const size = archiver.getArchiveSize(archiveId);
    expect(size).toBeGreaterThan(0);
  });

  test('should get archives', () => {
    logger.log('ACTION');
    const entries = logger.getEntries();
    archiver.archive(entries);
    const archives = archiver.getArchives();
    expect(archives.length).toBe(1);
    expect(archives[0]).toHaveProperty('id');
    expect(archives[0]).toHaveProperty('entryCount');
  });

  test('should respect max archives limit', () => {
    for (let i = 0; i < 7; i++) {
      logger.log(`ACTION${i}`);
      const entries = logger.getEntries();
      archiver.archive(entries);
      logger.reset();
    }
    const archives = archiver.getArchives();
    expect(archives.length).toBe(5);
  });

  test('should getSnapshot', () => {
    logger.log('ACTION');
    const entries = logger.getEntries();
    archiver.archive(entries);
    const snapshot = archiver.getSnapshot();
    expect(snapshot.metrics.totalArchives).toBe(1);
  });

  test('should reset', () => {
    logger.log('ACTION');
    const entries = logger.getEntries();
    archiver.archive(entries);
    archiver.reset();
    expect(archiver.getArchives().length).toBe(0);
  });

  test('should getReport', () => {
    logger.log('ACTION');
    const entries = logger.getEntries();
    archiver.archive(entries);
    const report = archiver.getReport();
    expect(report).toContain('Audit Archiver Report');
    expect(report).toContain('Total Archives: 1');
  });

  test('should exportMetrics', () => {
    logger.log('ACTION');
    const entries = logger.getEntries();
    archiver.archive(entries);
    const metrics = archiver.exportMetrics();
    expect(metrics.version).toBe('V63');
    expect(metrics.metrics.totalArchives).toBe(1);
  });
});

describe('AuditReporter', () => {
  let reporter: AuditReporter;
  let logger: AuditLogger;
  let policy: AuditPolicy;
  let archiver: AuditArchiver;

  beforeEach(() => {
    reporter = new AuditReporter({ title: 'Test Report' });
    logger = new AuditLogger();
    policy = new AuditPolicy();
    archiver = new AuditArchiver();
  });

  afterEach(() => {
    reporter.reset();
    logger.reset();
    policy.reset();
    archiver.reset();
  });

  test('should create reporter with default config', () => {
    const defaultReporter = new AuditReporter();
    expect(defaultReporter.config.title).toBe('Audit Report');
    expect(defaultReporter.config.maxDetailEntries).toBe(100);
  });

  test('should generate report', () => {
    logger.log('ACTION1');
    logger.log('ACTION2');
    const report = reporter.generate(logger, policy, archiver);
    expect(report).toBeTruthy();
    expect(report.id).toBeTruthy();
    expect(report.title).toBe('Test Report');
  });

  test('should generate report with date range', () => {
    logger.log('ACTION');
    const startDate = new Date(Date.now() - 86400000);
    const endDate = new Date();
    const report = reporter.generate(logger, policy, archiver, { startDate, endDate });
    expect(report.period).toBeTruthy();
  });

  test('should generate report with custom title', () => {
    logger.log('ACTION');
    const report = reporter.generate(logger, policy, archiver, { title: 'Custom Title' });
    expect(report.title).toBe('Custom Title');
  });

  test('should get summary', () => {
    logger.log('ACTION1');
    logger.log('ACTION2');
    const report = reporter.generate(logger, policy, archiver, { title: 'Custom Title' });
    const summary = reporter.summary(report.id);
    expect(summary).toContain('Report: Custom Title');
  });

  test('should export as JSON', () => {
    logger.log('ACTION');
    const report = reporter.generate(logger, policy, archiver);
    const json = reporter.export(report.id, 'json');
    expect(json).toContain('"title"');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('should export as CSV', () => {
    logger.log('ACTION', { userId: 'user1' });
    const report = reporter.generate(logger, policy, archiver);
    const csv = reporter.export(report.id, 'csv');
    expect(csv).toContain('Timestamp,Level,Action,User ID');
    expect(csv).toContain('user1');
  });

  test('should export as text', () => {
    logger.log('ACTION');
    const report = reporter.generate(logger, policy, archiver);
    const text = reporter.export(report.id, 'text');
    expect(text).toContain('===');
    expect(text).toContain('Top 5 Actions');
  });

  test('should get report', () => {
    logger.log('ACTION');
    const report = reporter.generate(logger, policy, archiver);
    const found = reporter.getReport(report.id);
    expect(found).toBeTruthy();
    expect(found?.id).toBe(report.id);
  });

  test('should return undefined for non-existent report', () => {
    const found = reporter.getReport('non-existent-id');
    expect(found).toBeUndefined();
  });

  test('should getSnapshot', () => {
    logger.log('ACTION');
    reporter.generate(logger, policy, archiver);
    const snapshot = reporter.getSnapshot();
    expect(snapshot.metrics.totalReportsGenerated).toBe(1);
  });

  test('should reset', () => {
    logger.log('ACTION');
    reporter.generate(logger, policy, archiver);
    reporter.reset();
    const snapshot = reporter.getSnapshot();
    expect(snapshot.metrics.totalReportsGenerated).toBe(0);
  });

  test('should getStatus', () => {
    logger.log('ACTION');
    reporter.generate(logger, policy, archiver);
    const report = reporter.getStatus();
    expect(report).toContain('Audit Reporter Status');
    expect(report).toContain('Total Reports Generated: 1');
  });

  test('should exportMetrics', () => {
    logger.log('ACTION');
    reporter.generate(logger, policy, archiver);
    const metrics = reporter.exportMetrics();
    expect(metrics.version).toBe('V63');
    expect(metrics.metrics.totalReportsGenerated).toBe(1);
  });
});