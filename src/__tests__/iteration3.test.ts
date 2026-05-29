/**
 * iteration3.test.ts - Test suite for doc-editor V33 Iteration 3 modules
 * Tests Engine, Parser, Validator, and Converter modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine } from '../iteration3/Engine';
import { Parser } from '../iteration3/Parser';
import { Validator } from '../iteration3/Validator';
import { Converter } from '../iteration3/Converter';

describe('Engine', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  it('should create a new engine instance', () => {
    expect(engine).toBeDefined();
  });

  it('should start with start()', () => {
    const state = engine.start('testOperation');
    expect(state).toBeDefined();
    expect(state.status).toBe('running');
  });

  it('should stop with stop()', () => {
    engine.start();
    const state = engine.stop();
    expect(state.status).toBe('stopped');
  });

  it('should get state with getState()', () => {
    const state = engine.getState();
    expect(state).toBeDefined();
    expect(state.status).toBeDefined();
  });

  it('should execute operation with execute()', () => {
    engine.start();
    const result = engine.execute('testOp', () => ({ success: true }));
    expect(result).toBeDefined();
    expect((result as { success: boolean }).success).toBe(true);
  });

  it('should throw error when executing on stopped engine', () => {
    expect(() => engine.execute('testOp', () => {})).toThrow();
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.state).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should reset with reset()', () => {
    engine.start();
    engine.reset();
    const state = engine.getState();
    expect(state.status).toBe('stopped');
  });

  it('should get report with getReport()', () => {
    const report = engine.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
    expect(report.metrics).toBeDefined();
    expect(report.health).toBeGreaterThanOrEqual(0);
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = engine.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.timestamp).toBeDefined();
    expect(exported.metrics).toBeDefined();
    expect(exported.exportVersion).toBe('V33-I3');
  });
});

describe('Parser', () => {
  let parser: Parser;

  beforeEach(() => {
    parser = new Parser();
  });

  it('should create a new parser instance', () => {
    expect(parser).toBeDefined();
  });

  it('should parse JSON data', () => {
    const result = parser.parse('{"key": "value"}', 'json');
    expect(result).toBeDefined();
    expect(result.data).toEqual({ key: 'value' });
    expect(result.format).toBe('json');
  });

  it('should parse YAML data', () => {
    const result = parser.parse('key: value', 'yaml');
    expect(result).toBeDefined();
    expect(result.format).toBe('yaml');
  });

  it('should parse XML data', () => {
    const result = parser.parse('<item>test</item>', 'xml');
    expect(result).toBeDefined();
    expect(result.format).toBe('xml');
  });

  it('should parse CSV data', () => {
    const result = parser.parse('name,age\nJohn,30', 'csv');
    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should format data to JSON', () => {
    const formatted = parser.format({ test: true }, 'json');
    expect(formatted).toBeDefined();
    expect(formatted).toContain('"test"');
  });

  it('should format data to YAML', () => {
    const formatted = parser.format({ key: 'value' }, 'yaml');
    expect(formatted).toBeDefined();
    expect(formatted).toContain('key:');
  });

  it('should format data to XML', () => {
    const formatted = parser.format({ item: 'test' }, 'xml');
    expect(formatted).toBeDefined();
    expect(formatted).toContain('<item>');
  });

  it('should get parsed data with getParsed()', () => {
    const result = parser.parse('{"test": true}', 'json');
    const id = Array.from((parser as unknown as { parsedData: Map<string, { data: unknown; format: string; timestamp: number; size: number }> }).parsedData.keys())[0];
    const found = parser.getParsed(id);
    expect(found).toBeDefined();
  });

  it('should get all parsed with getAllParsed()', () => {
    parser.parse('{"a": 1}', 'json');
    const all = parser.getAllParsed();
    expect(all).toBeInstanceOf(Map);
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = parser.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset with reset()', () => {
    parser.parse('{"test": true}', 'json');
    parser.reset();
    const snapshot = parser.getSnapshot();
    expect(snapshot.parsedData.size).toBe(0);
  });

  it('should get report with getReport()', () => {
    const report = parser.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = parser.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.exportVersion).toBe('V33-I3');
  });
});

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  it('should create a new validator instance', () => {
    expect(validator).toBeDefined();
  });

  it('should validate with validate()', () => {
    const result = validator.validate({ name: 'test' }, [
      { type: 'required', field: 'name', message: 'Name is required' }
    ]);
    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
  });

  it('should fail validation for missing required fields', () => {
    const result = validator.validate({}, [
      { type: 'required', field: 'name', message: 'Name is required' }
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should check conditions with check()', () => {
    expect(validator.check('test', 'is-defined')).toBe(true);
    expect(validator.check('test', 'is-string')).toBe(true);
    expect(validator.check(123, 'is-number')).toBe(true);
    expect(validator.check(true, 'is-boolean')).toBe(true);
    expect(validator.check({}, 'is-object')).toBe(true);
    expect(validator.check([], 'is-array')).toBe(true);
  });

  it('should check invalid conditions', () => {
    expect(validator.check(null, 'is-defined')).toBe(false);
    expect(validator.check(123, 'is-string')).toBe(false);
    expect(validator.check('test', 'is-number')).toBe(false);
  });

  it('should check isValid()', () => {
    const valid = validator.isValid({ name: 'test' }, [
      { type: 'required', field: 'name' }
    ]);
    expect(valid).toBe(true);
  });

  it('should validate range constraints', () => {
    const result = validator.validate({ age: 25 }, [
      { type: 'range', field: 'age', value: { min: 18, max: 65 } }
    ]);
    expect(result.valid).toBe(true);
  });

  it('should fail range validation', () => {
    const result = validator.validate({ age: 10 }, [
      { type: 'range', field: 'age', value: { min: 18, max: 65 } }
    ]);
    expect(result.valid).toBe(false);
  });

  it('should get result with getResult()', () => {
    const result = validator.validate({ name: 'test' }, [
      { type: 'required', field: 'name' }
    ]);
    const id = Array.from((validator as unknown as { results: Map<string, { valid: boolean; errors: string[]; warnings: string[]; timestamp: number }> }).results.keys())[0];
    const found = validator.getResult(id);
    expect(found).toBeDefined();
  });

  it('should get all results with getAllResults()', () => {
    validator.validate({ name: 'test' }, [{ type: 'required', field: 'name' }]);
    const all = validator.getAllResults();
    expect(all).toBeInstanceOf(Map);
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = validator.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset with reset()', () => {
    validator.validate({ name: 'test' }, [{ type: 'required', field: 'name' }]);
    validator.reset();
    const snapshot = validator.getSnapshot();
    expect(snapshot.results.size).toBe(0);
  });

  it('should get report with getReport()', () => {
    const report = validator.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = validator.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.exportVersion).toBe('V33-I3');
  });
});

describe('Converter', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  it('should create a new converter instance', () => {
    expect(converter).toBeDefined();
  });

  it('should convert JSON to YAML', () => {
    const result = converter.convert({ key: 'value' }, 'json', 'yaml');
    expect(result).toBeDefined();
    expect(result.sourceFormat).toBe('json');
    expect(result.targetFormat).toBe('yaml');
  });

  it('should convert JSON to XML', () => {
    const result = converter.convert({ item: 'test' }, 'json', 'xml');
    expect(result).toBeDefined();
    expect(result.data).toContain('<item>');
  });

  it('should convert same format returns same data', () => {
    const data = { test: true };
    const result = converter.convert(data, 'json', 'json');
    expect(result.data).toEqual(data);
  });

  it('should transform with transform()', () => {
    const result = converter.transform({ a: 1 }, (data) => {
      const d = data as { a: number };
      return { b: d.a + 1 };
    });
    expect(result).toBeDefined();
    expect((result.data as { b: number }).b).toBe(2);
  });

  it('should convert to base64', () => {
    const result = converter.convert('test string', 'text', 'base64');
    expect(result).toBeDefined();
    expect(typeof result.data).toBe('string');
  });

  it('should convert from base64', () => {
    const result = converter.convert('dGVzdA==', 'base64', 'text');
    expect(result).toBeDefined();
    expect(result.data).toBe('test');
  });

  it('should get converted with getConverted()', () => {
    const result = converter.convert({ test: true }, 'json', 'yaml');
    const id = Array.from((converter as unknown as { conversions: Map<string, { data: unknown; sourceFormat: string; targetFormat: string; timestamp: number; size: number }> }).conversions.keys())[0];
    const found = converter.getConverted(id);
    expect(found).toBeDefined();
  });

  it('should get all converted with getAllConverted()', () => {
    converter.convert({ a: 1 }, 'json', 'yaml');
    const all = converter.getAllConverted();
    expect(all).toBeInstanceOf(Map);
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = converter.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset with reset()', () => {
    converter.convert({ test: true }, 'json', 'yaml');
    converter.reset();
    const snapshot = converter.getSnapshot();
    expect(snapshot.conversions.size).toBe(0);
  });

  it('should get report with getReport()', () => {
    const report = converter.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = converter.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.exportVersion).toBe('V33-I3');
  });
});