import { describe, it, expect } from 'vitest';
import { Pipeline, Stage, Context, Result } from '../iter20';

describe('iter20 modules', () => {
  describe('Pipeline', () => {
    it('should add stages and execute', () => {
      const p = new Pipeline();
      p.addStage(s => s.toUpperCase());
      p.addStage(s => s + '!');
      expect(p.execute('hello')).toBe('HELLO!');
    });
    it('should count stages', () => {
      const p = new Pipeline();
      p.addStage(s => s);
      expect(p.getStagesCount()).toBe(1);
    });
    it('should get snapshot', () => {
      const p = new Pipeline();
      expect(p.getSnapshot().stages).toBe(0);
    });
    it('should reset', () => {
      const p = new Pipeline();
      p.addStage(s => s);
      p.reset();
      expect(p.getSnapshot().executed).toBe(0);
    });
    it('should get report', () => {
      const p = new Pipeline();
      expect(typeof p.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const p = new Pipeline();
      expect(p.exportMetrics()).toBeDefined();
    });
  });

  describe('Stage', () => {
    it('should run and update status', () => {
      const s = new Stage('S1', input => input + '_processed');
      expect(s.run('input')).toBe('input_processed');
      expect(s.getStatus()).toBe('completed');
    });
    it('should have name', () => {
      const s = new Stage('my-stage', s => s);
      expect(s.name).toBe('my-stage');
    });
    it('should get snapshot', () => {
      const s = new Stage('snap', s => s);
      expect(s.getSnapshot().name).toBe('snap');
    });
    it('should reset', () => {
      const s = new Stage('res', s => s);
      s.run('x');
      s.reset();
      expect(s.getStatus()).toBe('pending');
    });
    it('should get report', () => {
      const s = new Stage('rep', s => s);
      expect(typeof s.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const s = new Stage('met', s => s);
      expect(s.exportMetrics()).toBeDefined();
    });
  });

  describe('Context', () => {
    it('should set and get', () => {
      const c = new Context();
      c.set('key1', 'value1');
      expect(c.get('key1')).toBe('value1');
    });
    it('should check has', () => {
      const c = new Context();
      c.set('k', 'v');
      expect(c.has('k')).toBe(true);
      expect(c.has('missing')).toBe(false);
    });
    it('should get snapshot', () => {
      const c = new Context();
      expect(c.getSnapshot().keys).toBe(0);
    });
    it('should reset', () => {
      const c = new Context();
      c.set('x', 'y');
      c.reset();
      expect(c.getSnapshot().keys).toBe(0);
    });
    it('should get report', () => {
      const c = new Context();
      expect(typeof c.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const c = new Context();
      expect(c.exportMetrics()).toBeDefined();
    });
  });

  describe('Result', () => {
    it('should create success result', () => {
      const r = new Result(true, 'data');
      expect(r.isSuccess()).toBe(true);
      expect(r.getData()).toBe('data');
    });
    it('should create failure result', () => {
      const r = new Result(false);
      expect(r.isSuccess()).toBe(false);
    });
    it('should get snapshot', () => {
      const r = new Result(true, 'x');
      expect(r.getSnapshot().success).toBe(true);
    });
    it('should reset', () => {
      const r = new Result(true, 'd');
      r.reset();
      expect(r.isSuccess()).toBe(false);
    });
    it('should get report', () => {
      const r = new Result(true);
      expect(typeof r.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const r = new Result(true);
      expect(r.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const p = new Pipeline();
    expect(typeof p.addStage).toBe('function');
    expect(typeof p.execute).toBe('function');
    expect(typeof p.getStagesCount).toBe('function');
    expect(typeof p.getSnapshot).toBe('function');
    expect(typeof p.reset).toBe('function');
    expect(typeof p.getReport).toBe('function');
    expect(typeof p.exportMetrics).toBe('function');
  });
});
