/**
 * validation-engine.test.ts - V82 Validation Engine Tests
 */

import { ValidationEngine } from '../validation-engine/ValidationEngine';
import { SchemaValidator } from '../validation-engine/SchemaValidator';
import { DataValidator } from '../validation-engine/DataValidator';
import { RuleEngine } from '../validation-engine/RuleEngine';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine({ version: '1.0.0' });
  });

  test('should create engine with config', () => {
    expect(engine.config.version).toBe('1.0.0');
  });

  test('should add and get rules', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Test Rule',
      validate: (data) => typeof data === 'string',
    });
    const rules = engine.getRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('rule1');
  });

  test('should remove rule', () => {
    engine.addRule({ id: 'rule1', name: 'Test', validate: () => true });
    const removed = engine.removeRule('rule1');
    expect(removed).toBe(true);
    expect(engine.getRules()).toHaveLength(0);
  });

  test('should validate data successfully', async () => {
    engine.addRule({
      id: 'rule1',
      name: 'Is String',
      validate: (data) => typeof data === 'string',
    });
    const result = await engine.validate('hello');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should fail validation', async () => {
    engine.addRule({
      id: 'rule1',
      name: 'Is String',
      validate: (data) => typeof data === 'string',
    });
    const result = await engine.validate(123);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should return snapshot', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalValidations).toBe(0);
  });

  test('should reset engine', async () => {
    engine.addRule({ id: 'rule1', name: 'Test', validate: () => true });
    await engine.validate('test');
    engine.reset();
    expect(engine.getRules()).toHaveLength(0);
    expect(engine.getSnapshot().metrics.totalValidations).toBe(0);
  });

  test('should get report', () => {
    const report = engine.getReport();
    expect(report).toContain('ValidationEngine Report');
  });

  test('should export metrics', () => {
    const metrics = engine.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.metrics).toBeDefined();
  });
});

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator({ version: '1.0.0' });
  });

  test('should create with config', () => {
    expect(validator.config.version).toBe('1.0.0');
  });

  test('should apply schema', () => {
    validator.apply({
      name: { type: 'string', required: true },
      age: { type: 'number', required: false },
    });
    const schema = validator.getSchema();
    expect(Object.keys(schema)).toHaveLength(2);
  });

  test('should validate correct data', () => {
    validator.apply({ name: { type: 'string', required: true } });
    const result = validator.validate({ name: 'John' });
    expect(result).toBe(true);
    expect(validator.getErrors()).toHaveLength(0);
  });

  test('should fail on missing required field', () => {
    validator.apply({ name: { type: 'string', required: true } });
    const result = validator.validate({});
    expect(result).toBe(false);
    expect(validator.getErrors().length).toBeGreaterThan(0);
  });

  test('should fail on type mismatch', () => {
    validator.apply({ age: { type: 'number' } });
    const result = validator.validate({ age: 'not a number' });
    expect(result).toBe(false);
  });

  test('should enforce minLength', () => {
    validator.apply({ name: { type: 'string', minLength: 3 } });
    const result = validator.validate({ name: 'ab' });
    expect(result).toBe(false);
  });

  test('should enforce maxLength', () => {
    validator.apply({ name: { type: 'string', maxLength: 5 } });
    const result = validator.validate({ name: 'abcdef' });
    expect(result).toBe(false);
  });

  test('should return snapshot', () => {
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset', () => {
    validator.apply({ name: { type: 'string' } });
    validator.validate({ name: 'test' });
    validator.reset();
    expect(validator.getSchema()).toEqual({});
    expect(validator.getErrors()).toHaveLength(0);
  });

  test('should get report', () => {
    const report = validator.getReport();
    expect(report).toContain('SchemaValidator Report');
  });

  test('should export metrics', () => {
    const metrics = validator.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator({ version: '1.0.0' });
  });

  test('should create with config', () => {
    expect(validator.config.version).toBe('1.0.0');
  });

  test('should validate non-null data', () => {
    const result = validator.validate({ key: 'value' });
    expect(result).toBe(true);
  });

  test('should fail on null data', () => {
    const result = validator.validate(null);
    expect(result).toBe(false);
  });

  test('should clean data', () => {
    const cleaned = validator.clean({ name: '  John  ', age: 25 });
    expect(cleaned.name).toBe('John');
  });

  test('should trim strings', () => {
    validator = new DataValidator({ version: '1.0.0', trimWhitespace: true });
    const result = validator.validate({ name: '  test  ' });
    expect(result).toBe(true);
  });

  test('should get stats', () => {
    validator.clean({ name: '  test  ' });
    const stats = validator.getStats();
    expect(stats.totalCleaned).toBe(1);
  });

  test('should get errors', () => {
    validator.validate(null);
    expect(validator.getErrors().length).toBeGreaterThan(0);
  });

  test('should return snapshot', () => {
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset', () => {
    validator.clean({ name: 'test' });
    validator.reset();
    expect(validator.getStats().totalCleaned).toBe(0);
  });

  test('should get report', () => {
    const report = validator.getReport();
    expect(report).toContain('DataValidator Report');
  });

  test('should export metrics', () => {
    const metrics = validator.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine({ version: '1.0.0' });
  });

  test('should create with config', () => {
    expect(engine.config.version).toBe('1.0.0');
  });

  test('should add and get rules', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Test Rule',
      condition: { field: 'name', operator: 'exists', value: undefined },
      action: { type: 'error', message: 'Name required' },
    });
    expect(engine.getRules()).toHaveLength(1);
  });

  test('should remove rule', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Test',
      condition: { field: 'x', operator: 'exists', value: undefined },
      action: { type: 'log', message: 'test' },
    });
    const removed = engine.removeRule('rule1');
    expect(removed).toBe(true);
    expect(engine.getRules()).toHaveLength(0);
  });

  test('should evaluate and match rule', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Name Exists',
      condition: { field: 'name', operator: 'exists', value: undefined },
      action: { type: 'error', message: 'Name required' },
    });
    const result = engine.evaluate({ name: 'John' });
    expect(result.matched).toContain('rule1');
    expect(result.actions).toHaveLength(1);
  });

  test('should evaluate eq operator', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Status Check',
      condition: { field: 'status', operator: 'eq', value: 'active' },
      action: { type: 'warning', message: 'Active status' },
    });
    const result = engine.evaluate({ status: 'active' });
    expect(result.matched).toContain('rule1');
  });

  test('should evaluate neq operator', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Not Admin',
      condition: { field: 'role', operator: 'neq', value: 'admin' },
      action: { type: 'log', message: 'Not admin' },
    });
    const result = engine.evaluate({ role: 'user' });
    expect(result.matched).toContain('rule1');
  });

  test('should evaluate gt operator', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Age Check',
      condition: { field: 'age', operator: 'gt', value: 18 },
      action: { type: 'log', message: 'Adult' },
    });
    const result = engine.evaluate({ age: 25 });
    expect(result.matched).toContain('rule1');
  });

  test('should skip disabled rules', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Disabled Rule',
      condition: { field: 'x', operator: 'exists', value: undefined },
      action: { type: 'log', message: 'test' },
      enabled: false,
    });
    const result = engine.evaluate({ x: 1 });
    expect(result.matched).not.toContain('rule1');
  });

  test('should return snapshot', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalEvaluations).toBe(0);
  });

  test('should reset', () => {
    engine.addRule({
      id: 'rule1',
      name: 'Test',
      condition: { field: 'x', operator: 'exists', value: undefined },
      action: { type: 'log', message: 'test' },
    });
    engine.evaluate({ x: 1 });
    engine.reset();
    expect(engine.getRules()).toHaveLength(0);
    expect(engine.getSnapshot().metrics.totalEvaluations).toBe(0);
  });

  test('should get report', () => {
    const report = engine.getReport();
    expect(report).toContain('RuleEngine Report');
  });

  test('should export metrics', () => {
    const metrics = engine.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});