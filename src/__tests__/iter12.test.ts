import { describe, it, expect } from 'vitest';
import { Hub, Node, Link, Port } from '../iter12';

describe('iter12 modules', () => {
  describe('Hub', () => {
    it('should activate and deactivate', () => {
      const hub = new Hub();
      hub.activate();
      expect(hub.getState()).toBe('active');
      hub.deactivate();
      expect(hub.getState()).toBe('inactive');
    });
    it('should add and remove nodes', () => {
      const hub = new Hub();
      hub.addNode('n1');
      expect(hub.getNodes()).toContain('n1');
      hub.removeNode('n1');
      expect(hub.getNodes()).not.toContain('n1');
    });
    it('should get snapshot', () => {
      const hub = new Hub();
      expect(hub.getSnapshot().nodes).toBe(0);
    });
    it('should reset', () => {
      const hub = new Hub();
      hub.addNode('x');
      hub.reset();
      expect(hub.getNodes().length).toBe(0);
    });
    it('should get report', () => {
      const hub = new Hub();
      expect(typeof hub.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const hub = new Hub();
      expect(hub.exportMetrics()).toBeDefined();
    });
  });

  describe('Node', () => {
    it('should online and offline', () => {
      const node = new Node('n1');
      node.online();
      expect(node.getState()).toBe('online');
      node.offline();
      expect(node.getState()).toBe('offline');
    });
    it('should have id', () => {
      const node = new Node('test-node');
      expect(node.id).toBe('test-node');
    });
    it('should get snapshot', () => {
      const node = new Node('n2');
      expect(node.getSnapshot().id).toBe('n2');
    });
    it('should reset', () => {
      const node = new Node('n3');
      node.online();
      node.reset();
      expect(node.getState()).toBe('offline');
    });
    it('should get report', () => {
      const node = new Node('n4');
      expect(typeof node.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const node = new Node('n5');
      expect(node.exportMetrics()).toBeDefined();
    });
  });

  describe('Link', () => {
    it('should go up and down', () => {
      const link = new Link();
      link.up();
      expect(link.isActive()).toBe(true);
      link.down();
      expect(link.isActive()).toBe(false);
    });
    it('should get snapshot', () => {
      const link = new Link();
      expect(link.getSnapshot().active).toBe(false);
    });
    it('should reset', () => {
      const link = new Link();
      link.up();
      link.reset();
      expect(link.isActive()).toBe(false);
    });
    it('should get report', () => {
      const link = new Link();
      expect(typeof link.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const link = new Link();
      expect(link.exportMetrics()).toBeDefined();
    });
  });

  describe('Port', () => {
    it('should open and close', () => {
      const port = new Port(8080);
      port.openPort();
      expect(port.isOpenPort()).toBe(true);
      port.closePort();
      expect(port.isOpenPort()).toBe(false);
    });
    it('should have number', () => {
      const port = new Port(3000);
      expect(port.number).toBe(3000);
    });
    it('should get snapshot', () => {
      const port = new Port(9000);
      expect(port.getSnapshot().number).toBe(9000);
    });
    it('should reset', () => {
      const port = new Port(7070);
      port.openPort();
      port.reset();
      expect(port.isOpenPort()).toBe(false);
    });
    it('should get report', () => {
      const port = new Port(4040);
      expect(typeof port.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const port = new Port(5050);
      expect(port.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const hub = new Hub();
    expect(typeof hub.activate).toBe('function');
    expect(typeof hub.deactivate).toBe('function');
    expect(typeof hub.addNode).toBe('function');
    expect(typeof hub.removeNode).toBe('function');
    expect(typeof hub.getNodes).toBe('function');
    expect(typeof hub.getState).toBe('function');
    expect(typeof hub.getSnapshot).toBe('function');
    expect(typeof hub.reset).toBe('function');
    expect(typeof hub.getReport).toBe('function');
    expect(typeof hub.exportMetrics).toBe('function');
  });
});
