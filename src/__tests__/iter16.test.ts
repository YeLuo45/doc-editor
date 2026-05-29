import { describe, it, expect } from 'vitest';
import { Stream, Buffer, Channel, Queue } from '../iter16';

describe('iter16 modules', () => {
  describe('Stream', () => {
    it('should push and pop', () => {
      const s = new Stream();
      s.push('a');
      expect(s.pop()).toBe('a');
    });
    it('should peek', () => {
      const s = new Stream();
      s.push('b');
      expect(s.peek()).toBe('b');
      expect(s.size()).toBe(1);
    });
    it('should get snapshot', () => {
      const s = new Stream();
      expect(s.getSnapshot().items).toBe(0);
    });
    it('should reset', () => {
      const s = new Stream();
      s.push('c');
      s.reset();
      expect(s.size()).toBe(0);
    });
    it('should get report', () => {
      const s = new Stream();
      expect(typeof s.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const s = new Stream();
      expect(s.exportMetrics()).toBeDefined();
    });
  });

  describe('Buffer', () => {
    it('should write and read', () => {
      const b = new Buffer();
      expect(b.write('data')).toBe(true);
      expect(b.read()).toBe('data');
    });
    it('should respect capacity', () => {
      const b = new Buffer({ capacity: 1 });
      b.write('a');
      expect(b.write('b')).toBe(false);
    });
    it('should get snapshot', () => {
      const b = new Buffer();
      expect(b.getSnapshot().used).toBe(0);
    });
    it('should reset', () => {
      const b = new Buffer();
      b.write('x');
      b.reset();
      expect(b.getUsed()).toBe(0);
    });
    it('should get report', () => {
      const b = new Buffer();
      expect(typeof b.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const b = new Buffer();
      expect(b.exportMetrics()).toBeDefined();
    });
  });

  describe('Channel', () => {
    it('should subscribe and publish', () => {
      const c = new Channel();
      c.subscribe('u1');
      expect(c.getSubscribers()).toContain('u1');
      c.publish('msg1');
      expect(c.getMessages()).toContain('msg1');
    });
    it('should unsubscribe', () => {
      const c = new Channel();
      c.subscribe('u2');
      c.unsubscribe('u2');
      expect(c.getSubscribers()).not.toContain('u2');
    });
    it('should get snapshot', () => {
      const c = new Channel();
      expect(c.getSnapshot().subscribers).toBe(0);
    });
    it('should reset', () => {
      const c = new Channel();
      c.subscribe('u3');
      c.reset();
      expect(c.getSubscribers().length).toBe(0);
    });
    it('should get report', () => {
      const c = new Channel();
      expect(typeof c.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const c = new Channel();
      expect(c.exportMetrics()).toBeDefined();
    });
  });

  describe('Queue', () => {
    it('should enqueue and dequeue', () => {
      const q = new Queue();
      q.enqueue('a');
      expect(q.dequeue()).toBe('a');
    });
    it('should check front', () => {
      const q = new Queue();
      q.enqueue('b');
      expect(q.front()).toBe('b');
    });
    it('should check isEmpty', () => {
      const q = new Queue();
      expect(q.isEmpty()).toBe(true);
      q.enqueue('c');
      expect(q.isEmpty()).toBe(false);
    });
    it('should get snapshot', () => {
      const q = new Queue();
      expect(q.getSnapshot().length).toBe(0);
    });
    it('should reset', () => {
      const q = new Queue();
      q.enqueue('d');
      q.reset();
      expect(q.length()).toBe(0);
    });
    it('should get report', () => {
      const q = new Queue();
      expect(typeof q.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const q = new Queue();
      expect(q.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const s = new Stream();
    expect(typeof s.push).toBe('function');
    expect(typeof s.pop).toBe('function');
    expect(typeof s.peek).toBe('function');
    expect(typeof s.size).toBe('function');
    expect(typeof s.getSnapshot).toBe('function');
    expect(typeof s.reset).toBe('function');
    expect(typeof s.getReport).toBe('function');
    expect(typeof s.exportMetrics).toBe('function');
  });
});
