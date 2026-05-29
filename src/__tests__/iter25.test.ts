import { describe, it, expect } from 'vitest';
import { Serializer, Deserializer, Validator, Schema } from '../iter25';

describe('iter25 modules', () => {
  describe('Serializer', () => {
    it('should serialize data', () => {
      const s = new Serializer();
      expect(s.serialize({ a: 1 })).toBe('{"a":1}');
    });
    it('should deserialize', () => {
      const s = new Serializer();
      expect(s.deserialize('{"b":2}')).toEqual({ b: 2 });
    });
    it('should count serialized', () => {
      const s = new Serializer();
      s.serialize('x');
      expect(s.getSerializedCount()).toBe(1);
    });
    it('should get snapshot', () => {
      const s = new Serializer();
      expect(s.getSnapshot().serialized).toBe(0);
    });
    it('should reset', () => {
      const s = new Serializer();
      s.serialize('y');
      s.reset();
      expect(s.getSerializedCount()).toBe(0);
    });
    it('should get report', () => {
      const s = new Serializer();
      expect(typeof s.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const s = new Serializer();
      expect(s.exportMetrics()).toBeDefined();
    });
  });

  describe('Deserializer', () => {
    it('should deserialize', () => {
      const d = new Deserializer();
      expect(d.deserialize('{"c":3}')).toEqual({ c: 3 });
    });
    it('should count deserialized', () => {
      const d = new Deserializer();
      d.deserialize('{"d":4}');
      expect(d.getDeserializedCount()).toBe(1);
    });
    it('should get snapshot', () => {
      const d = new Deserializer();
      expect(d.getSnapshot().deserialized).toBe(0);
    });
    it('should reset', () => {
      const d = new Deserializer();
      d.deserialize('{"e":5}');
      d.reset();
      expect(d.getDeserializedCount()).toBe(0);
    });
    it('should get report', () => {
      const d = new Deserializer();
      expect(typeof d.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const d = new Deserializer();
      expect(d.exportMetrics()).toBeDefined();
    });
  });

  describe('Validator', () => {
    it('should validate', () => {
      const v = new Validator();
      expect(v.validate({})).toBe(true);
      expect(v.validate(null)).toBe(false);
    });
    it('should add errors', () => {
      const v = new Validator();
      v.addError('error1');
      expect(v.getErrors()).toContain('error1');
    });
    it('should clear errors', () => {
      const v = new Validator();
      v.addError('e');
      v.clearErrors();
      expect(v.getErrors().length).toBe(0);
    });
    it('should get snapshot', () => {
      const v = new Validator();
      expect(v.getSnapshot().validated).toBe(0);
    });
    it('should reset', () => {
      const v = new Validator();
      v.addError('x');
      v.reset();
      expect(v.getErrors().length).toBe(0);
    });
    it('should get report', () => {
      const v = new Validator();
      expect(typeof v.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const v = new Validator();
      expect(v.exportMetrics()).toBeDefined();
    });
  });

  describe('Schema', () => {
    it('should add and get fields', () => {
      const sc = new Schema('user');
      sc.addField('name', 'string');
      sc.addField('age', 'number');
      expect(sc.getFieldType('name')).toBe('string');
    });
    it('should remove fields', () => {
      const sc = new Schema('test');
      sc.addField('f1', 'string');
      sc.removeField('f1');
      expect(sc.getFieldType('f1')).toBeUndefined();
    });
    it('should have name', () => {
      const sc = new Schema('my-schema');
      expect(sc.name).toBe('my-schema');
    });
    it('should get snapshot', () => {
      const sc = new Schema('snap');
      expect(sc.getSnapshot().name).toBe('snap');
    });
    it('should reset', () => {
      const sc = new Schema('res');
      sc.addField('x', 'y');
      sc.reset();
      expect(sc.getSnapshot().fields).toBe(0);
    });
    it('should get report', () => {
      const sc = new Schema('rep');
      expect(typeof sc.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const sc = new Schema('met');
      expect(sc.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const s = new Serializer();
    expect(typeof s.serialize).toBe('function');
    expect(typeof s.deserialize).toBe('function');
    expect(typeof s.getSerializedCount).toBe('function');
    expect(typeof s.getSnapshot).toBe('function');
    expect(typeof s.reset).toBe('function');
    expect(typeof s.getReport).toBe('function');
    expect(typeof s.exportMetrics).toBe('function');
  });
});
