/**
 * import-export.test.ts - V71 Import/Export Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportEngine } from '../import-export/ImportEngine';
import { ExportEngine } from '../import-export/ExportEngine';
import { FormatConverter } from '../import-export/FormatConverter';
import { DataValidator } from '../import-export/DataValidator';

describe('ImportEngine', () => {
  let engine: ImportEngine;

  beforeEach(() => {
    engine = new ImportEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  it('should import JSON data successfully', async () => {
    const result = await engine.import('{"name":"test","value":123}', 'json');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test', value: 123 });
  });

  it('should reject unsupported formats', async () => {
    const result = await engine.import('test data', 'pdf');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should parse YAML data', async () => {
    const result = await engine.import('name: test\nvalue: 123', 'yaml');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should parse CSV data', async () => {
    const csv = 'name,age\ntest,25';
    const result = await engine.import(csv, 'csv');
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should get supported formats', () => {
    const formats = engine.getSupportedFormats();
    expect(formats).toContain('json');
    expect(formats).toContain('yaml');
    expect(formats).toContain('csv');
  });

  it('should provide snapshot metrics', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalImports).toBeDefined();
  });

  it('should reset state correctly', () => {
    engine.reset();
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics.totalImports).toBe(0);
  });

  it('should generate report', () => {
    const report = engine.getReport();
    expect(report).toContain('ImportEngine');
    expect(report).toContain('Total Imports');
  });

  it('should export metrics', () => {
    const metrics = engine.exportMetrics();
    expect(metrics.version).toBe('v71-import-engine');
  });
});

describe('ExportEngine', () => {
  let engine: ExportEngine;

  beforeEach(() => {
    engine = new ExportEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  it('should export data to JSON', async () => {
    const result = await engine.export({ name: 'test', value: 456 }, 'json');
    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
  });

  it('should export data to YAML format', async () => {
    const result = await engine.export({ key: 'value' }, 'yaml');
    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('string');
  });

  it('should export data to CSV format', async () => {
    const data = [{ name: 'a', age: 1 }, { name: 'b', age: 2 }];
    const result = await engine.export(data, 'csv');
    expect(result.success).toBe(true);
  });

  it('should get export formats', () => {
    const formats = engine.getExportFormats();
    expect(formats.length).toBeGreaterThan(0);
  });

  it('should convert between formats', () => {
    const converted = engine.convert({ test: 'value' }, 'json', 'yaml');
    expect(typeof converted).toBe('string');
  });

  it('should reject unsupported export formats', async () => {
    const result = await engine.export({ data: 'test' }, 'xyz');
    expect(result.success).toBe(false);
  });

  it('should track export metrics', () => {
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset export state', () => {
    engine.reset();
    const snapshot = engine.getSnapshot();
    expect(snapshot.metrics.totalExports).toBe(0);
  });

  it('should generate export report', () => {
    const report = engine.getReport();
    expect(report).toContain('ExportEngine');
  });

  it('should export metrics with version', () => {
    const metrics = engine.exportMetrics();
    expect(metrics.version).toBe('v71-export-engine');
  });
});

describe('FormatConverter', () => {
  let converter: FormatConverter;

  beforeEach(() => {
    converter = new FormatConverter();
  });

  afterEach(() => {
    converter.reset();
  });

  it('should convert JSON to YAML', () => {
    const result = converter.convert({ name: 'test' }, 'json', 'yaml');
    expect(result.success).toBe(true);
  });

  it('should convert JSON to XML', () => {
    const result = converter.convert({ name: 'test' }, 'json', 'xml');
    expect(result.success).toBe(true);
  });

  it('should convert CSV to JSON', () => {
    const csvData = 'name,age\ntest,25';
    const result = converter.convert(csvData, 'csv', 'json');
    expect(result.success).toBe(true);
  });

  it('should reject invalid source format', () => {
    const result = converter.convert({ test: 'data' }, 'invalid', 'json');
    expect(result.success).toBe(false);
  });

  it('should reject invalid target format', () => {
    const result = converter.convert({ test: 'data' }, 'json', 'invalid');
    expect(result.success).toBe(false);
  });

  it('should track conversion stats', () => {
    const stats = converter.getConversionStats();
    expect(stats.totalConversions).toBeDefined();
  });

  it('should get snapshot metrics', () => {
    const snapshot = converter.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset converter state', () => {
    converter.reset();
    const stats = converter.getConversionStats();
    expect(stats.totalConversions).toBe(0);
  });

  it('should generate conversion report', () => {
    const report = converter.getReport();
    expect(report).toContain('FormatConverter');
  });

  it('should export converter metrics', () => {
    const metrics = converter.exportMetrics();
    expect(metrics.version).toBe('v71-format-converter');
  });
});

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  afterEach(() => {
    validator.reset();
  });

  it('should validate correct data', () => {
    const result = validator.validate({ name: 'test', age: 25 });
    expect(result.valid).toBe(true);
  });

  it('should reject null data', () => {
    const result = validator.validate(null);
    expect(result.valid).toBe(false);
  });

  it('should detect undefined fields', () => {
    const result = validator.validate({ name: undefined });
    expect(result.valid).toBe(false);
  });

  it('should get errors from validation result', () => {
    const result = validator.validate({ name: undefined });
    const errors = validator.getErrors(result);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should clean data by trimming whitespace', () => {
    const data = { name: '  test  ', value: 123 };
    const cleaned = validator.clean(data);
    expect(cleaned).toEqual({ name: 'test', value: 123 });
  });

  it('should recursively clean nested objects', () => {
    const data = { outer: { inner: '  value  ' } };
    const cleaned = validator.clean(data) as Record<string, unknown>;
    expect((cleaned.outer as Record<string, unknown>).inner).toBe('value');
  });

  it('should validate against schema', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    };
    const result = validator.validate({ name: 'test' }, schema);
    expect(result.valid).toBe(true);
  });

  it('should report missing required fields', () => {
    const schema = {
      type: 'object',
      required: ['name', 'email'],
    };
    const result = validator.validate({ name: 'test' }, schema);
    expect(result.valid).toBe(false);
  });

  it('should get schema', () => {
    const schema = { type: 'object' };
    validator.validate({ data: 'test' }, schema);
    expect(validator.getSchema()).toEqual(schema);
  });

  it('should get validation snapshot', () => {
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset validator state', () => {
    validator.validate({ name: 'test' });
    validator.reset();
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics.totalValidations).toBe(0);
  });

  it('should generate validation report', () => {
    const report = validator.getReport();
    expect(report).toContain('DataValidator');
  });

  it('should export validator metrics', () => {
    const metrics = validator.exportMetrics();
    expect(metrics.version).toBe('v71-data-validator');
  });

  it('should warn about whitespace in strict mode', () => {
    const validatorStrict = new DataValidator({ strictMode: true, trimWhitespace: true });
    const result = validatorStrict.validate({ name: '  test  ' });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle array data validation', () => {
    const result = validator.validate([1, 2, 3]);
    expect(result.valid).toBe(true);
  });
});

describe('Import-Export Integration', () => {
  it('should import and validate data end to end', async () => {
    const importEngine = new ImportEngine();
    const validator = new DataValidator();
    
    const importResult = await importEngine.import('{"name":"test","value":123}', 'json');
    expect(importResult.success).toBe(true);
    
    const validationResult = validator.validate(importResult.data);
    expect(validationResult.valid).toBe(true);
  });

  it('should import, convert, and export', async () => {
    const importEngine = new ImportEngine();
    const converter = new FormatConverter();
    const exportEngine = new ExportEngine();
    
    const importResult = await importEngine.import('{"test":"value"}', 'json');
    expect(importResult.success).toBe(true);
    
    const converted = converter.convert(importResult.data, 'json', 'yaml');
    expect(converted.success).toBe(true);
    
    const exportResult = await exportEngine.export(converted.data, 'yaml');
    expect(exportResult.success).toBe(true);
  });
});