import { describe, it, expect } from 'vitest';
import { EventEmitter, EventBus, EventHandler, EventLoop } from '../iter24';

describe('iter24 modules', () => {
  describe('EventEmitter', () => {
    it('should add and emit events', () => {
      const ee = new EventEmitter();
      let count = 0;
      ee.on('click', () => count++);
      ee.emit('click');
      expect(count).toBe(1);
    });
    it('should remove listeners', () => {
      const ee = new EventEmitter();
      const fn = () => {};
      ee.on('test', fn);
      ee.off('test', fn);
      expect(ee.listenerCount('test')).toBe(0);
    });
    it('should count listeners', () => {
      const ee = new EventEmitter();
      ee.on('e1', () => {});
      ee.on('e1', () => {});
      expect(ee.listenerCount('e1')).toBe(2);
    });
    it('should get snapshot', () => {
      const ee = new EventEmitter();
      expect(ee.getSnapshot().listeners).toBe(0);
    });
    it('should reset', () => {
      const ee = new EventEmitter();
      ee.on('x', () => {});
      ee.reset();
      expect(ee.getSnapshot().listeners).toBe(0);
    });
    it('should get report', () => {
      const ee = new EventEmitter();
      expect(typeof ee.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const ee = new EventEmitter();
      expect(ee.exportMetrics()).toBeDefined();
    });
  });

  describe('EventBus', () => {
    it('should subscribe and publish', () => {
      const eb = new EventBus();
      eb.subscribe('ch1');
      eb.publish('ch1', { type: 'msg' });
      expect(eb.getEvents('ch1').length).toBe(1);
    });
    it('should unsubscribe', () => {
      const eb = new EventBus();
      eb.subscribe('ch2');
      eb.unsubscribe('ch2');
      expect(eb.getEvents('ch2').length).toBe(0);
    });
    it('should get snapshot', () => {
      const eb = new EventBus();
      expect(eb.getSnapshot().channels).toBe(0);
    });
    it('should reset', () => {
      const eb = new EventBus();
      eb.subscribe('x');
      eb.reset();
      expect(eb.getSnapshot().channels).toBe(0);
    });
    it('should get report', () => {
      const eb = new EventBus();
      expect(typeof eb.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const eb = new EventBus();
      expect(eb.exportMetrics()).toBeDefined();
    });
  });

  describe('EventHandler', () => {
    it('should handle events', () => {
      const eh = new EventHandler('h1');
      eh.handle('event');
      expect(eh.getHandledCount()).toBe(1);
    });
    it('should have name', () => {
      const eh = new EventHandler('my-handler');
      expect(eh.name).toBe('my-handler');
    });
    it('should get snapshot', () => {
      const eh = new EventHandler('snap');
      expect(eh.getSnapshot().name).toBe('snap');
    });
    it('should reset', () => {
      const eh = new EventHandler('res');
      eh.handle('x');
      eh.reset();
      expect(eh.getHandledCount()).toBe(0);
    });
    it('should get report', () => {
      const eh = new EventHandler('rep');
      expect(typeof eh.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const eh = new EventHandler('met');
      expect(eh.exportMetrics()).toBeDefined();
    });
  });

  describe('EventLoop', () => {
    it('should enqueue and tick', () => {
      const el = new EventLoop();
      let ran = false;
      el.enqueue(() => { ran = true; });
      el.tick();
      expect(ran).toBe(true);
      expect(el.getProcessed()).toBe(1);
    });
    it('should report size', () => {
      const el = new EventLoop();
      el.enqueue(() => {});
      expect(el.size()).toBe(1);
    });
    it('should get snapshot', () => {
      const el = new EventLoop();
      expect(el.getSnapshot().queue).toBe(0);
    });
    it('should reset', () => {
      const el = new EventLoop();
      el.enqueue(() => {});
      el.reset();
      expect(el.getSnapshot().queue).toBe(0);
    });
    it('should get report', () => {
      const el = new EventLoop();
      expect(typeof el.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const el = new EventLoop();
      expect(el.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const ee = new EventEmitter();
    expect(typeof ee.on).toBe('function');
    expect(typeof ee.off).toBe('function');
    expect(typeof ee.emit).toBe('function');
    expect(typeof ee.listenerCount).toBe('function');
    expect(typeof ee.getSnapshot).toBe('function');
    expect(typeof ee.reset).toBe('function');
    expect(typeof ee.getReport).toBe('function');
    expect(typeof ee.exportMetrics).toBe('function');
  });
});
