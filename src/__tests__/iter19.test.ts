import { describe, it, expect } from 'vitest';
import { Aggregator, Filter, Sorter, Grouper } from '../iter19';

describe('iter19 modules', () => {
  describe('Aggregator', () => {
    it('should add and sum', () => {
      const a = new Aggregator();
      a.add(1); a.add(2); a.add(3);
      expect(a.sum()).toBe(6);
    });
    it('should calculate avg', () => {
      const a = new Aggregator();
      a.add(2); a.add(4);
      expect(a.avg()).toBe(3);
    });
    it('should get items', () => {
      const a = new Aggregator();
      a.add(5);
      expect(a.getItems()).toContain(5);
    });
    it('should get snapshot', () => {
      const a = new Aggregator();
      expect(a.getSnapshot().items).toBe(0);
    });
    it('should reset', () => {
      const a = new Aggregator();
      a.add(1);
      a.reset();
      expect(a.getItems().length).toBe(0);
    });
    it('should get report', () => {
      const a = new Aggregator();
      expect(typeof a.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const a = new Aggregator();
      expect(a.exportMetrics()).toBeDefined();
    });
  });

  describe('Filter', () => {
    it('should add rule and apply', () => {
      const f = new Filter();
      f.addRule(s => s.length > 3);
      expect(f.apply('hello')).toBe(true);
      expect(f.apply('hi')).toBe(false);
    });
    it('should clear rules', () => {
      const f = new Filter();
      f.addRule(() => true);
      f.clear();
      expect(f.getRulesCount()).toBe(0);
    });
    it('should get snapshot', () => {
      const f = new Filter();
      expect(f.getSnapshot().rules).toBe(0);
    });
    it('should reset', () => {
      const f = new Filter();
      f.addRule(() => false);
      f.reset();
      expect(f.getRulesCount()).toBe(0);
    });
    it('should get report', () => {
      const f = new Filter();
      expect(typeof f.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const f = new Filter();
      expect(f.exportMetrics()).toBeDefined();
    });
  });

  describe('Sorter', () => {
    it('should add and sort asc', () => {
      const s = new Sorter({ order: 'asc' });
      s.add('b'); s.add('a'); s.add('c');
      expect(s.sort()[0]).toBe('a');
    });
    it('should add and sort desc', () => {
      const s = new Sorter({ order: 'desc' });
      s.add('b'); s.add('a'); s.add('c');
      expect(s.sort()[0]).toBe('c');
    });
    it('should get snapshot', () => {
      const s = new Sorter();
      expect(s.getSnapshot().items).toBe(0);
    });
    it('should reset', () => {
      const s = new Sorter();
      s.add('x');
      s.reset();
      expect(s.getItems().length).toBe(0);
    });
    it('should get report', () => {
      const s = new Sorter();
      expect(typeof s.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const s = new Sorter();
      expect(s.exportMetrics()).toBeDefined();
    });
  });

  describe('Grouper', () => {
    it('should add and get group', () => {
      const g = new Grouper();
      g.add('group1', 'item1');
      expect(g.getGroup('group1')).toContain('item1');
    });
    it('should get groups', () => {
      const g = new Grouper();
      g.add('A', '1');
      g.add('B', '2');
      expect(g.getGroups()).toContain('A');
    });
    it('should get snapshot', () => {
      const g = new Grouper();
      expect(g.getSnapshot().groups).toBe(0);
    });
    it('should reset', () => {
      const g = new Grouper();
      g.add('X', 'y');
      g.reset();
      expect(g.getSnapshot().groups).toBe(0);
    });
    it('should get report', () => {
      const g = new Grouper();
      expect(typeof g.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const g = new Grouper();
      expect(g.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const a = new Aggregator();
    expect(typeof a.add).toBe('function');
    expect(typeof a.sum).toBe('function');
    expect(typeof a.avg).toBe('function');
    expect(typeof a.getItems).toBe('function');
    expect(typeof a.getSnapshot).toBe('function');
    expect(typeof a.reset).toBe('function');
    expect(typeof a.getReport).toBe('function');
    expect(typeof a.exportMetrics).toBe('function');
  });
});
