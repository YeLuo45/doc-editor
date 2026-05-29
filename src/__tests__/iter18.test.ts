import { describe, it, expect } from 'vitest';
import { Node, Edge, Graph, Tree } from '../iter18';

describe('iter18 modules', () => {
  describe('Node', () => {
    it('should set and get label', () => {
      const n = new Node('N1');
      n.setLabel('label1');
      expect(n.getLabel()).toBe('label1');
    });
    it('should have id', () => {
      const n = new Node('my-id');
      expect(n.id).toBe('my-id');
    });
    it('should get snapshot', () => {
      const n = new Node('N2');
      expect(n.getSnapshot().id).toBe('N2');
    });
    it('should reset', () => {
      const n = new Node('N3');
      n.setLabel('custom');
      n.reset();
      expect(n.getLabel()).toBe('N3');
    });
    it('should get report', () => {
      const n = new Node('N4');
      expect(typeof n.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const n = new Node('N5');
      expect(n.exportMetrics()).toBeDefined();
    });
  });

  describe('Edge', () => {
    it('should have from and to', () => {
      const e = new Edge('A', 'B');
      expect(e.from).toBe('A');
      expect(e.to).toBe('B');
    });
    it('should get and set weight', () => {
      const e = new Edge('C', 'D', { weight: 5 });
      expect(e.getWeight()).toBe(5);
      e.setWeight(10);
      expect(e.getWeight()).toBe(10);
    });
    it('should get snapshot', () => {
      const e = new Edge('E', 'F');
      expect(e.getSnapshot().from).toBe('E');
    });
    it('should reset', () => {
      const e = new Edge('G', 'H', { weight: 3 });
      e.setWeight(7);
      e.reset();
      expect(e.getWeight()).toBe(3);
    });
    it('should get report', () => {
      const e = new Edge('I', 'J');
      expect(typeof e.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const e = new Edge('K', 'L');
      expect(e.exportMetrics()).toBeDefined();
    });
  });

  describe('Graph', () => {
    it('should add nodes', () => {
      const g = new Graph();
      g.addNode('n1');
      expect(g.getNodes()).toContain('n1');
    });
    it('should add edges', () => {
      const g = new Graph();
      g.addNode('a');
      g.addNode('b');
      expect(g.addEdge('a', 'b')).toBe(true);
    });
    it('should remove node', () => {
      const g = new Graph();
      g.addNode('x');
      g.removeNode('x');
      expect(g.getNodes()).not.toContain('x');
    });
    it('should get snapshot', () => {
      const g = new Graph();
      expect(g.getSnapshot().nodes).toBe(0);
    });
    it('should reset', () => {
      const g = new Graph();
      g.addNode('y');
      g.reset();
      expect(g.getSnapshot().nodes).toBe(0);
    });
    it('should get report', () => {
      const g = new Graph();
      expect(typeof g.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const g = new Graph();
      expect(g.exportMetrics()).toBeDefined();
    });
  });

  describe('Tree', () => {
    it('should add children', () => {
      const t = new Tree('root');
      t.addChild('root', 'child1');
      expect(t.getChildren('root')).toContain('child1');
    });
    it('should have root', () => {
      const t = new Tree('my-root');
      expect(t.getRoot()).toBe('my-root');
    });
    it('should check hasNode', () => {
      const t = new Tree('R');
      t.addChild('R', 'C');
      expect(t.hasNode('R')).toBe(true);
      expect(t.hasNode('C')).toBe(true);
    });
    it('should get snapshot', () => {
      const t = new Tree('SR');
      expect(t.getSnapshot().root).toBe('SR');
    });
    it('should reset', () => {
      const t = new Tree('TR');
      t.addChild('TR', 'TC');
      t.reset();
      expect(t.getChildren('TR').length).toBe(0);
    });
    it('should get report', () => {
      const t = new Tree('rep');
      expect(typeof t.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const t = new Tree('met');
      expect(t.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const n = new Node('check');
    expect(typeof n.setLabel).toBe('function');
    expect(typeof n.getLabel).toBe('function');
    expect(typeof n.getSnapshot).toBe('function');
    expect(typeof n.reset).toBe('function');
    expect(typeof n.getReport).toBe('function');
    expect(typeof n.exportMetrics).toBe('function');
  });
});
