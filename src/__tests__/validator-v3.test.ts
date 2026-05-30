/**
 * validator-v3.test.ts - Validator V3 Test Suite
 * Version: 128.0.0
 * 
 * Comprehensive tests for ValidatorV3, ValidatorRegistryV3,
 * ValidatorExecutorV3, and ValidatorMonitorV3.
 */

import {
  ValidatorV3,
  ValidationRule,
  ValidationResult,
  ValidatorStats,
} from '../validator-v3/ValidatorV3';

import {
  ValidatorRegistryV3,
  RegistryStats,
} from '../validator-v3/ValidatorRegistryV3';

import {
  ValidatorExecutorV3,
  ExecutorConfig,
  ExecutionResult,
  AggregatedResult,
} from '../validator-v3/ValidatorExecutorV3';

import {
  ValidatorMonitorV3,
  MonitorConfig,
  MonitorMetric,
  MonitorStatus,
} from '../validator-v3/ValidatorMonitorV3';

// Helper to create a simple validation rule
const createRule = (
  id: string,
  name: string,
  validator: (value: unknown) => boolean,
  priority = 0
): ValidationRule => ({
  id,
  name,
  priority,
  enabled: true,
  validate: (value: unknown) => {
    const start = Date.now();
    const valid = validator(value);
    return {
      valid,
      errors: valid ? [] : [{ code: 'VALIDATION_FAILED', message: 'Validation failed', field: id }],
      warnings: [],
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  },
});

// ==================== ValidatorV3 Tests ====================

describe('ValidatorV3', () => {
  let validator: ValidatorV3;

  beforeEach(() => {
    validator = new ValidatorV3({ name: 'TestValidator' });
  });

  test('should create with default config', () => {
    const v = new ValidatorV3();
    expect(v.config.name).toBe('ValidatorV3');
    expect(v.config.strict).toBe(false);
  });

  test('should validate value with no rules as valid', () => {
    const result = validator.validate('test');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should add and execute rule', () => {
    const rule = createRule('r1', 'Required', (v) => v !== null && v !== undefined);
    validator.addRule(rule);
    const result = validator.validate('hello');
    expect(result.valid).toBe(true);
  });

  test('should fail validation when rule fails', () => {
    const rule = createRule('r1', 'NonEmpty', (v) => String(v).length > 0);
    validator.addRule(rule);
    const result = validator.validate('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should remove rule by id', () => {
    const rule = createRule('r1', 'Required', () => true);
    validator.addRule(rule);
    expect(validator.removeRule('r1')).toBe(true);
    expect(validator.removeRule('nonexistent')).toBe(false);
  });

  test('should get validator self-reference', () => {
    const v = validator.getValidator();
    expect(v).toBe(validator);
  });

  test('should track validation statistics', () => {
    validator.validate('test');
    const stats = validator.getStats();
    expect(stats.validationCount).toBe(1);
    expect(stats.name).toBe('TestValidator');
  });

  test('should reset statistics', () => {
    validator.validate('test');
    validator.reset();
    const stats = validator.getStats();
    expect(stats.validationCount).toBe(0);
  });

  test('should generate report', () => {
    const report = validator.getReport();
    expect(report).toContain('ValidatorV3 Report');
    expect(report).toContain('TestValidator');
  });

  test('should export metrics with version', () => {
    const metrics = validator.exportMetrics();
    expect(metrics.version).toBe('128.0.0');
    expect(metrics.stats).toBeDefined();
  });

  test('should get snapshot', () => {
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });
});

// ==================== ValidatorRegistryV3 Tests ====================

describe('ValidatorRegistryV3', () => {
  let registry: ValidatorRegistryV3;

  beforeEach(() => {
    registry = new ValidatorRegistryV3({ name: 'TestRegistry' });
  });

  test('should register validator', () => {
    const v = new ValidatorV3({ name: 'V1' });
    expect(registry.register(v)).toBe(true);
    expect(registry.has('V1')).toBe(true);
  });

  test('should not allow duplicates by default', () => {
    const v1 = new ValidatorV3({ name: 'V1' });
    const v2 = new ValidatorV3({ name: 'V1' });
    registry.register(v1);
    expect(registry.register(v2)).toBe(false);
  });

  test('should unregister validator', () => {
    const v = new ValidatorV3({ name: 'V1' });
    registry.register(v);
    expect(registry.unregister('V1')).toBe(true);
    expect(registry.has('V1')).toBe(false);
  });

  test('should get validator by name', () => {
    const v = new ValidatorV3({ name: 'V1' });
    registry.register(v);
    const retrieved = registry.get('V1');
    expect(retrieved).toBe(v);
  });

  test('should get all validators', () => {
    registry.register(new ValidatorV3({ name: 'V1' }));
    registry.register(new ValidatorV3({ name: 'V2' }));
    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  test('should check if validator exists', () => {
    const v = new ValidatorV3({ name: 'V1' });
    expect(registry.has('V1')).toBe(false);
    registry.register(v);
    expect(registry.has('V1')).toBe(true);
  });

  test('should reset registry', () => {
    registry.register(new ValidatorV3({ name: 'V1' }));
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('ValidatorRegistryV3 Report');
  });

  test('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('128.0.0');
  });

  test('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });
});

// ==================== ValidatorExecutorV3 Tests ====================

describe('ValidatorExecutorV3', () => {
  let executor: ValidatorExecutorV3;

  beforeEach(() => {
    executor = new ValidatorExecutorV3();
  });

  test('should execute validator', () => {
    const v = new ValidatorV3({ name: 'V1' });
    const result = executor.execute(v, 'test');
    expect(result.success).toBe(true);
    expect(result.validatorName).toBe('V1');
  });

  test('should run across registry', () => {
    const registry = new ValidatorRegistryV3();
    registry.register(new ValidatorV3({ name: 'V1' }));
    registry.register(new ValidatorV3({ name: 'V2' }));

    const result = executor.run(registry, 'test');
    expect(result.totalValidators).toBe(2);
    expect(result.passed).toBe(2);
  });

  test('should track execution stats', () => {
    const v = new ValidatorV3({ name: 'V1' });
    executor.execute(v, 'test');
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
  });

  test('should get results', () => {
    const v = new ValidatorV3({ name: 'V1' });
    executor.execute(v, 'test');
    const results = executor.getResults();
    expect(results).toHaveLength(1);
  });

  test('should reset executor', () => {
    const v = new ValidatorV3({ name: 'V1' });
    executor.execute(v, 'test');
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  test('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('ValidatorExecutorV3 Report');
  });

  test('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('128.0.0');
  });

  test('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });
});

// ==================== ValidatorMonitorV3 Tests ====================

describe('ValidatorMonitorV3', () => {
  let monitor: ValidatorMonitorV3;

  beforeEach(() => {
    monitor = new ValidatorMonitorV3({ name: 'TestMonitor' });
  });

  test('should track validation operations', () => {
    const v = new ValidatorV3({ name: 'V1' });
    monitor.track(v, 'validate', 10, true);
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
  });

  test('should get metrics for specific validator', () => {
    const v1 = new ValidatorV3({ name: 'V1' });
    const v2 = new ValidatorV3({ name: 'V2' });
    monitor.track(v1, 'validate', 10, true);
    monitor.track(v2, 'validate', 20, true);
    const v1Metrics = monitor.getMetrics('V1');
    expect(v1Metrics).toHaveLength(1);
  });

  test('should get history with limit', () => {
    const v = new ValidatorV3({ name: 'V1' });
    for (let i = 0; i < 10; i++) {
      monitor.track(v, 'validate', i, true);
    }
    const history = monitor.getHistory(5);
    expect(history).toHaveLength(5);
  });

  test('should return healthy status when error rate low', () => {
    const v = new ValidatorV3({ name: 'V1' });
    monitor.track(v, 'validate', 10, true);
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
  });

  test('should reset monitor', () => {
    const v = new ValidatorV3({ name: 'V1' });
    monitor.track(v, 'validate', 10, true);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(0);
  });

  test('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('ValidatorMonitorV3 Report');
  });

  test('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('128.0.0');
    expect(metrics.status).toBeDefined();
  });

  test('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });
});