import { describe, it, expect } from 'vitest';
import { Scanner, Parser, Renderer, Encoder } from '../iter15';

describe('iter15 modules', () => {
  describe('Scanner', () => {
    it('should scan', () => {
      const s = new Scanner();
      expect(s.scan('target1')).toBe(true);
      expect(s.getScannedCount()).toBe(1);
    });
    it('should add issues', () => {
      const s = new Scanner();
      s.addIssue('issue1');
      expect(s.getIssues()).toContain('issue1');
    });
    it('should get snapshot', () => {
      const s = new Scanner();
      expect(s.getSnapshot().scanned).toBe(0);
    });
    it('should reset', () => {
      const s = new Scanner();
      s.scan('x');
      s.reset();
      expect(s.getScannedCount()).toBe(0);
    });
    it('should get report', () => {
      const s = new Scanner();
      expect(typeof s.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const s = new Scanner();
      expect(s.exportMetrics()).toBeDefined();
    });
  });

  describe('Parser', () => {
    it('should parse valid json', () => {
      const p = new Parser();
      expect(p.parse('{"a":1}')).toEqual({ a: 1 });
    });
    it('should handle invalid json', () => {
      const p = new Parser();
      expect(p.parse('invalid')).toBeNull();
      expect(p.getErrors()).toBe(1);
    });
    it('should get snapshot', () => {
      const p = new Parser();
      expect(p.getSnapshot().parsed).toBe(0);
    });
    it('should reset', () => {
      const p = new Parser();
      p.parse('{}');
      p.reset();
      expect(p.getParsedCount()).toBe(0);
    });
    it('should get report', () => {
      const p = new Parser();
      expect(typeof p.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const p = new Parser();
      expect(p.exportMetrics()).toBeDefined();
    });
  });

  describe('Renderer', () => {
    it('should render', () => {
      const r = new Renderer();
      expect(r.render('scene1')).toBe('rendered:scene1');
      expect(r.getFrames()).toBe(1);
    });
    it('should get snapshot', () => {
      const r = new Renderer();
      expect(r.getSnapshot().frames).toBe(0);
    });
    it('should reset', () => {
      const r = new Renderer();
      r.render('x');
      r.reset();
      expect(r.getFrames()).toBe(0);
    });
    it('should get report', () => {
      const r = new Renderer();
      expect(typeof r.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const r = new Renderer();
      expect(r.exportMetrics()).toBeDefined();
    });
  });

  describe('Encoder', () => {
    it('should encode and decode', () => {
      const e = new Encoder();
      const encoded = e.encode('hello');
      expect(encoded).not.toBe('hello');
      expect(e.decode(encoded)).toBe('hello');
    });
    it('should count encoded', () => {
      const e = new Encoder();
      e.encode('a');
      expect(e.getEncodedCount()).toBe(1);
    });
    it('should get snapshot', () => {
      const e = new Encoder();
      expect(e.getSnapshot()).toBeDefined();
    });
    it('should reset', () => {
      const e = new Encoder();
      e.encode('x');
      e.reset();
      expect(e.getEncodedCount()).toBe(0);
    });
    it('should get report', () => {
      const e = new Encoder();
      expect(typeof e.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const e = new Encoder();
      expect(e.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const s = new Scanner();
    expect(typeof s.scan).toBe('function');
    expect(typeof s.addIssue).toBe('function');
    expect(typeof s.getIssues).toBe('function');
    expect(typeof s.getScannedCount).toBe('function');
    expect(typeof s.getSnapshot).toBe('function');
    expect(typeof s.reset).toBe('function');
    expect(typeof s.getReport).toBe('function');
    expect(typeof s.exportMetrics).toBe('function');
  });
});
