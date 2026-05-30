/**
 * validator-v2.test.ts - Tests for Validator V2 Components
 * Version: 1.20.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidatorV2, ValidationRule, ValidatorConfig, ValidationResult } from '../validator-v2/ValidatorV2';
import { ValidatorRegistryV2, RegistryEntry } from '../validator-v2/ValidatorRegistryV2';
import { ValidatorExecutorV2, ExecutionResult, AggregatedResult } from '../validator-v2/ValidatorExecutorV2';
import { ValidatorMonitorV2, MetricPoint, MonitorConfig } from '../validator-v2/ValidatorMonitorV2';

describe('ValidatorV2', () => {
  let validator: ValidatorV2;

  beforeEach(() => {
    validator = new ValidatorV2();
  });

  it('should create a validator with default config', () => {
    expect(validator).toBeDefined();
    expect(validator.config.strictMode).toBe(true);
  });

  it('should validate a value with no rules as valid', () => {
    const result = validator.validate('test');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should add and remove rules', () => {
    const rule: ValidationRule = {
      id: 'rule1',
      name: 'Test Rule',
      validate: (v) => v !== null,
      message: 'Value cannot be null',
      severity: 'error',
    };
    
    validator.addRule(rule);
    expect(validator.removeRule('rule1')).toBe(true);
    expect(validator.removeRule('rule1')).toBe(false);
  });

  it('should fail validation when rule does not pass', () => {
    const rule: ValidationRule = {
      id: 'required',
      name: 'Required',
      validate: (v) => v !== null && v !== undefined && v !== '',
      message: 'Value is required',
      severity: 'error',
    };
    
    validator.addRule(rule);
    const result = validator.validate('');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].ruleId).toBe('required');
  });

  it('should track validation statistics', () => {
    const rule: ValidationRule = {
      id: 'min',
      name: 'Min Length',
      validate: (v) => String(v).length >= 3,
      message: 'Min length is 3',
      severity: 'error',
    };
    
    validator.addRule(rule);
    validator.validate('ab');
    validator.validate('abc');
    validator.validate('abcd');
    
    const stats = validator.getStats();
    expect(stats.totalValidations).toBe(3);
    expect(stats.ruleCount).toBe(1);
  });

  it('should get validator instance', () => {
    expect(validator.getValidator()).toBe(validator);
  });

  it('should reset statistics', () => {
    validator.validate('test');
    validator.reset();
    const stats = validator.getStats();
    expect(stats.totalValidations).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = validator.exportMetrics();
    expect(exported.version).toBe('1.20.0');
    expect(exported.metrics).toBeDefined();
  });

  it('should get snapshot of metrics', () => {
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.ruleCount).toBe(0);
  });
});

describe('ValidatorRegistryV2', () => {
  let registry: ValidatorRegistryV2;

  beforeEach(() => {
    registry = new ValidatorRegistryV2();
  });

  it('should register and lookup validators', () => {
    const validator = new ValidatorV2();
    registry.register('test', validator);
    
    expect(registry.has('test')).toBe(true);
    expect(registry.get('test')).toBe(validator);
  });

  it('should throw when registering duplicate', () => {
    const validator = new ValidatorV2();
    registry.register('test', validator);
    
    expect(() => registry.register('test', new ValidatorV2())).toThrow();
  });

  it('should allow overwriting when configured', () => {
    registry = new ValidatorRegistryV2({ allowOverwrite: true });
    registry.register('test', new ValidatorV2());
    registry.register('test', new ValidatorV2());
    expect(registry.get('test')).toBeDefined();
  });

  it('should unregister validators', () => {
    registry.register('test', new ValidatorV2());
    expect(registry.unregister('test')).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  it('should get all registered validators', () => {
    registry.register('v1', new ValidatorV2());
    registry.register('v2', new ValidatorV2());
    
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should create and register validator in one call', () => {
    const validator = registry.createAndRegister('myValidator', { strictMode: false });
    expect(registry.has('myValidator')).toBe(true);
    expect(validator.config.strictMode).toBe(false);
  });

  it('should reset registry statistics', () => {
    registry.register('test', new ValidatorV2());
    registry.get('test');
    registry.reset();
    const stats = registry.getStats();
    expect(stats.totalLookups).toBe(0);
  });
});

describe('ValidatorExecutorV2', () => {
  let executor: ValidatorExecutorV2;
  let validator: ValidatorV2;

  beforeEach(() => {
    executor = new ValidatorExecutorV2();
    validator = new ValidatorV2();
    validator.addRule({
      id: 'pass',
      name: 'Always Pass',
      validate: () => true,
      message: 'Always passes',
      severity: 'error',
    });
  });

  it('should execute validation on a validator', () => {
    const result = executor.execute(validator, 'test');
    expect(result.success).toBe(true);
    expect(result.result.valid).toBe(true);
  });

  it('should track execution statistics', () => {
    executor.execute(validator, 'test');
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successCount).toBe(1);
  });

  it('should run across registry', async () => {
    const registry = new ValidatorRegistryV2();
    registry.register('v1', validator);
    
    const result = await executor.run(registry, 'test');
    expect(result.totalValidators).toBe(1);
    expect(result.passed).toBe(1);
  });

  it('should get results from last execution', () => {
    executor.execute(validator, 'test');
    const results = executor.getResults();
    expect(results).toHaveLength(1);
  });

  it('should reset executor state', () => {
    executor.execute(validator, 'test');
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });
});

describe('ValidatorMonitorV2', () => {
  let monitor: ValidatorMonitorV2;

  beforeEach(() => {
    monitor = new ValidatorMonitorV2();
  });

  it('should track events', () => {
    monitor.track('validation', { value: 10 });
    const status = monitor.getStatus();
    expect(status.totalTracks).toBe(1);
  });

  it('should get metrics', () => {
    monitor.track('latency', { value: 100 });
    monitor.track('latency', { value: 200 });
    
    const metrics = monitor.getMetrics('latency') as MetricPoint[];
    expect(metrics).toHaveLength(2);
  });

  it('should get history', () => {
    monitor.track('event1');
    monitor.track('event2');
    const history = monitor.getHistory();
    expect(history).toHaveLength(2);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.isActive).toBe(true);
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should reset monitor', () => {
    monitor.track('test');
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracks).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported.version).toBe('1.20.0');
  });

  it('should stop and start monitor', () => {
    monitor.stop();
    expect(monitor.getStatus().isActive).toBe(false);
    monitor.start();
    expect(monitor.getStatus().isActive).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should work together as a system', async () => {
    // Create validator with rules
    const validator = new ValidatorV2();
    validator.addRule({
      id: 'email',
      name: 'Email Format',
      validate: (v) => typeof v === 'string' && v.includes('@'),
      message: 'Invalid email format',
      severity: 'error',
    });
    
    // Register in registry
    const registry = new ValidatorRegistryV2();
    registry.register('email', validator);
    
    // Execute with executor
    const executor = new ValidatorExecutorV2();
    const result = await executor.run(registry, 'test@example.com');
    expect(result.passed).toBe(1);
    
    // Monitor tracks the activity
    const monitor = new ValidatorMonitorV2();
    monitor.track('validation', { value: result.totalDuration });
    expect(monitor.getStatus().totalTracks).toBe(1);
  });

  it('should handle validation failures gracefully', () => {
    const validator = new ValidatorV2();
    validator.addRule({
      id: 'fail',
      name: 'Always Fail',
      validate: () => false,
      message: 'Always fails',
      severity: 'error',
    });
    
    const result = validator.validate('anything');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    
    const report = validator.getReport();
    expect(report).toContain('Validator V2 Report');
  });

  it('should handle registry with multiple validators', () => {
    const registry = new ValidatorRegistryV2();
    
    const v1 = new ValidatorV2();
    v1.addRule({ id: 'r1', name: 'R1', validate: () => true, message: '', severity: 'error' });
    
    const v2 = new ValidatorV2();
    v2.addRule({ id: 'r2', name: 'R2', validate: () => false, message: 'fail', severity: 'error' });
    
    registry.register('validator1', v1);
    registry.register('validator2', v2);
    
    expect(registry.getAll().size).toBe(2);
    
    const report = registry.getReport();
    expect(report).toContain('validator1');
    expect(report).toContain('validator2');
  });
});