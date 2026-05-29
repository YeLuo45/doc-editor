import { describe, it, expect } from 'vitest';
import { Monitor, Watcher, Tracker, Alert } from '../iter21';

describe('iter21 modules', () => {
  describe('Monitor', () => {
    it('should set and get', () => {
      const m = new Monitor();
      m.set('cpu', 85);
      expect(m.get('cpu')).toBe(85);
    });
    it('should inc', () => {
      const m = new Monitor();
      m.inc('requests');
      m.inc('requests', 5);
      expect(m.get('requests')).toBe(6);
    });
    it('should get snapshot', () => {
      const m = new Monitor();
      expect(m.getSnapshot().metrics).toBe(0);
    });
    it('should reset', () => {
      const m = new Monitor();
      m.set('x', 1);
      m.reset();
      expect(m.getSnapshot().metrics).toBe(0);
    });
    it('should get report', () => {
      const m = new Monitor();
      expect(typeof m.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const m = new Monitor();
      expect(m.exportMetrics()).toBeDefined();
    });
  });

  describe('Watcher', () => {
    it('should watch and unwatch', () => {
      const w = new Watcher();
      w.watch('id1');
      expect(w.getWatched()).toContain('id1');
      w.unwatch('id1');
      expect(w.getWatched()).not.toContain('id1');
    });
    it('should trigger', () => {
      const w = new Watcher();
      w.watch('id2');
      w.trigger('id2');
      expect(w.getTriggered()).toContain('id2');
    });
    it('should get snapshot', () => {
      const w = new Watcher();
      expect(w.getSnapshot().watched).toBe(0);
    });
    it('should reset', () => {
      const w = new Watcher();
      w.watch('x');
      w.reset();
      expect(w.getSnapshot().watched).toBe(0);
    });
    it('should get report', () => {
      const w = new Watcher();
      expect(typeof w.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const w = new Watcher();
      expect(w.exportMetrics()).toBeDefined();
    });
  });

  describe('Tracker', () => {
    it('should track events', () => {
      const t = new Tracker();
      t.track('click', { button: 'A' });
      expect(t.getEvents().length).toBe(1);
      expect(t.getEvents()[0].name).toBe('click');
    });
    it('should clear', () => {
      const t = new Tracker();
      t.track('event');
      t.clear();
      expect(t.getEvents().length).toBe(0);
    });
    it('should get snapshot', () => {
      const t = new Tracker();
      expect(t.getSnapshot().events).toBe(0);
    });
    it('should reset', () => {
      const t = new Tracker();
      t.track('x');
      t.reset();
      expect(t.getSnapshot().events).toBe(0);
    });
    it('should get report', () => {
      const t = new Tracker();
      expect(typeof t.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const t = new Tracker();
      expect(t.exportMetrics()).toBeDefined();
    });
  });

  describe('Alert', () => {
    it('should send alerts', () => {
      const a = new Alert();
      a.send('something happened', 'info');
      expect(a.getAlerts().length).toBe(1);
    });
    it('should send with level', () => {
      const a = new Alert();
      a.send('warning msg', 'warn');
      a.send('error msg', 'error');
      expect(a.getAlerts()[0].level).toBe('warn');
      expect(a.getAlerts()[1].level).toBe('error');
    });
    it('should get count', () => {
      const a = new Alert();
      a.send('msg');
      expect(a.getCount()).toBe(1);
    });
    it('should get snapshot', () => {
      const a = new Alert();
      expect(a.getSnapshot().alerts).toBe(0);
    });
    it('should reset', () => {
      const a = new Alert();
      a.send('x');
      a.reset();
      expect(a.getSnapshot().alerts).toBe(0);
    });
    it('should get report', () => {
      const a = new Alert();
      expect(typeof a.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const a = new Alert();
      expect(a.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const m = new Monitor();
    expect(typeof m.set).toBe('function');
    expect(typeof m.get).toBe('function');
    expect(typeof m.inc).toBe('function');
    expect(typeof m.getSnapshot).toBe('function');
    expect(typeof m.reset).toBe('function');
    expect(typeof m.getReport).toBe('function');
    expect(typeof m.exportMetrics).toBe('function');
  });
});
