import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine, Processor, Validator, Reporter } from '../iter10/index';

describe('iter10 modules', () => {
  describe('Engine', () => {
    it('should start and stop', () => {
      const engine = new Engine();
      expect(engine.start()).toBe(true);
      expect(engine.getState()).toBe('running');
      expect(engine.stop()).toBe(true);
      expect(engine.getState()).toBe('stopped');
    });
    it('should get snapshot', () => {
      const engine = new Engine();
      engine.start();
      const snap = engine.getSnapshot();
      expect(snap).toBeDefined();
      expect(snap.state).toBe('running');
    });
    it('should reset state', () => {
      const engine = new Engine();
      engine.start();
      engine.reset();
      expect(engine.getState()).toBe('idle');
    });
    it('should get report', () => {
      const engine = new Engine();
      const report = engine.getReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
    it('should export metrics', () => {
      const engine = new Engine();
      const metrics = engine.exportMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Processor', () => {
    it('should process data', () => {
      const processor = new Processor();
      expect(processor.process('hello')).toBe('PROCESSED: hello');
    });
    it('should transform data', () => {
      const processor = new Processor();
      expect(processor.transform('test')).toBe('transformed:test');
    });
    it('should get processed results', () => {
      const processor = new Processor();
      processor.process('a');
      processor.process('b');
      const results = processor.getProcessed();
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
    it('should get snapshot', () => {
      const processor = new Processor();
      const snap = processor.getSnapshot();
      expect(snap).toBeDefined();
    });
    it('should reset', () => {
      const processor = new Processor();
      processor.process('x');
      processor.reset();
      expect(processor.getProcessed().length).toBe(0);
    });
    it('should get report', () => {
      const processor = new Processor();
      expect(typeof processor.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const processor = new Processor();
      expect(processor.exportMetrics()).toBeDefined();
    });
  });

  describe('Validator', () => {
    it('should validate valid input', () => {
      const validator = new Validator();
      expect(validator.validate('hello')).toBe(true);
    });
    it('should check input', () => {
      const validator = new Validator();
      expect(validator.check('test')).toBe(true);
    });
    it('should return valid status', () => {
      const validator = new Validator();
      expect(validator.isValid('ok')).toBe(true);
      expect(validator.isValid('')).toBe(false);
    });
    it('should get snapshot', () => {
      const validator = new Validator();
      const snap = validator.getSnapshot();
      expect(snap).toBeDefined();
    });
    it('should reset', () => {
      const validator = new Validator();
      validator.validate('x');
      validator.reset();
      expect(validator.getSnapshot().validCount).toBe(0);
    });
    it('should get report', () => {
      const validator = new Validator();
      expect(typeof validator.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const validator = new Validator();
      expect(validator.exportMetrics()).toBeDefined();
    });
  });

  describe('Reporter', () => {
    it('should report data', () => {
      const reporter = new Reporter();
      expect(reporter.report('test')).toBe(true);
    });
    it('should summarize', () => {
      const reporter = new Reporter();
      const result = reporter.summarize();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
    it('should get report', () => {
      const reporter = new Reporter();
      reporter.report('a');
      reporter.report('b');
      const r = reporter.getReport();
      expect(typeof r).toBe('string');
    });
    it('should get snapshot', () => {
      const reporter = new Reporter();
      const snap = reporter.getSnapshot();
      expect(snap).toBeDefined();
    });
    it('should reset', () => {
      const reporter = new Reporter();
      reporter.report('x');
      reporter.reset();
      expect(reporter.getSnapshot().reportCount).toBe(0);
    });
    it('should export metrics', () => {
      const reporter = new Reporter();
      expect(reporter.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const engine = new Engine();
    expect(typeof engine.start).toBe('function');
    expect(typeof engine.stop).toBe('function');
    expect(typeof engine.getState).toBe('function');
    expect(typeof engine.getSnapshot).toBe('function');
    expect(typeof engine.reset).toBe('function');
    expect(typeof engine.getReport).toBe('function');
    expect(typeof engine.exportMetrics).toBe('function');
  });
});
