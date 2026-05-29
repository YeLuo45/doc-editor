/**
 * event-queue.test.ts - V89 Event Queue Tests
 * Tests for EventQueue, EventDispatcher, EventScheduler, EventMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventQueue } from '../event-queue/EventQueue';
import { EventDispatcher } from '../event-queue/EventDispatcher';
import { EventScheduler } from '../event-queue/EventScheduler';
import { EventMonitor } from '../event-queue/EventMonitor';

describe('EventQueue', () => {
  let queue: EventQueue<{ data: string }>;

  beforeEach(() => {
    queue = new EventQueue({ maxSize: 10, maxRetries: 3 });
  });

  it('should enqueue events', () => {
    const event = queue.enqueue('test', { data: 'hello' });
    expect(event.type).toBe('test');
    expect(event.payload.data).toBe('hello');
    expect(queue.size()).toBe(1);
  });

  it('should dequeue events in priority order', () => {
    queue.enqueue('low', { data: 'low' }, { priority: 'low' });
    queue.enqueue('high', { data: 'high' }, { priority: 'high' });
    queue.enqueue('normal', { data: 'normal' });
    expect(queue.dequeue()?.priority).toBe('high');
    expect(queue.dequeue()?.priority).toBe('normal');
    expect(queue.dequeue()?.priority).toBe('low');
  });

  it('should peek without removing', () => {
    queue.enqueue('test', { data: 'hello' });
    expect(queue.peek()?.type).toBe('test');
    expect(queue.size()).toBe(1);
  });

  it('should get pending events', () => {
    queue.enqueue('a', { data: 'a' });
    queue.enqueue('b', { data: 'b' });
    expect(queue.getPending().length).toBe(2);
  });

  it('should throw when queue is full', () => {
    const smallQueue = new EventQueue({ maxSize: 2 });
    smallQueue.enqueue('a', { data: 'a' });
    smallQueue.enqueue('b', { data: 'b' });
    expect(() => smallQueue.enqueue('c', { data: 'c' })).toThrow();
  });

  it('should reset and clear all events', () => {
    queue.enqueue('test', { data: 'hello' });
    queue.reset();
    expect(queue.size()).toBe(0);
  });

  it('should export metrics with version', () => {
    queue.enqueue('test', { data: 'hello' });
    const metrics = queue.exportMetrics();
    expect(metrics.version).toBe('V89');
    expect(metrics.metrics.enqueued).toBe(1);
  });

  it('should generate snapshot with metrics', () => {
    queue.enqueue('test', { data: 'hello' });
    const snap = queue.getSnapshot();
    expect(snap.size).toBe(1);
    expect(snap.metrics.enqueued).toBe(1);
  });

  it('should generate report string', () => {
    queue.enqueue('test', { data: 'hello' });
    const report = queue.getReport();
    expect(report).toContain('EventQueue Report');
    expect(report).toContain('Enqueued: 1');
  });
});

describe('EventDispatcher', () => {
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    dispatcher = new EventDispatcher({ maxSubscribers: 10 });
  });

  it('should subscribe to events', () => {
    const id = dispatcher.subscribe('test', (payload) => {});
    expect(id).toMatch(/^sub_/);
    expect(dispatcher.hasSubscribers('test')).toBe(true);
  });

  it('should dispatch to subscribers', async () => {
    const received: string[] = [];
    dispatcher.subscribe('test', (payload: { data: string }) => {
      received.push(payload.data);
    });
    await dispatcher.dispatch('test', { data: 'hello' });
    expect(received).toContain('hello');
  });

  it('should unsubscribe by id', () => {
    dispatcher.subscribe('test', () => {});
    const id = dispatcher.subscribe('test', () => {});
    dispatcher.unsubscribe('test', id);
    expect(dispatcher.getSubscribers('test').length).toBe(1);
  });

  it('should get subscribers by event type', () => {
    dispatcher.subscribe('a', () => {});
    dispatcher.subscribe('b', () => {});
    expect(dispatcher.getSubscribers('a').length).toBe(1);
    expect(dispatcher.getSubscribers('b').length).toBe(1);
  });

  it('should return all subscribers when no type specified', () => {
    dispatcher.subscribe('a', () => {});
    dispatcher.subscribe('b', () => {});
    const all = dispatcher.getSubscribers();
    expect(all.length).toBe(2);
  });

  it('should export metrics with version', () => {
    dispatcher.subscribe('test', () => {});
    const metrics = dispatcher.exportMetrics();
    expect(metrics.version).toBe('V89');
  });

  it('should reset all subscribers and metrics', () => {
    dispatcher.subscribe('test', () => {});
    dispatcher.reset();
    expect(dispatcher.getSubscribers().length).toBe(0);
  });

  it('should generate snapshot with correct counts', () => {
    dispatcher.subscribe('test', () => {});
    const snap = dispatcher.getSnapshot();
    expect(snap.subscriberCount).toBe(1);
    expect(snap.eventTypes).toBe(1);
  });

  it('should throw when max subscribers reached', () => {
    const limited = new EventDispatcher({ maxSubscribers: 2 });
    limited.subscribe('test', () => {});
    limited.subscribe('test', () => {});
    expect(() => limited.subscribe('test', () => {})).toThrow();
  });
});

describe('EventScheduler', () => {
  let scheduler: EventScheduler;

  beforeEach(() => {
    scheduler = new EventScheduler({ maxScheduled: 10, maxHistory: 5 });
  });

  it('should schedule events', () => {
    const id = scheduler.schedule('test', { data: 'hello' }, 1000);
    expect(id).toMatch(/^sched_/);
    expect(scheduler.getScheduled().length).toBe(1);
  });

  it('should cancel scheduled events', () => {
    const id = scheduler.schedule('test', { data: 'hello' }, 1000);
    expect(scheduler.cancel(id)).toBe(true);
    expect(scheduler.getScheduled().length).toBe(0);
  });

  it('should get scheduled events', () => {
    scheduler.schedule('a', { data: 'a' }, 1000);
    scheduler.schedule('b', { data: 'b' }, 2000);
    expect(scheduler.getScheduled().length).toBe(2);
  });

  it('should get scheduled by type', () => {
    scheduler.schedule('test', { data: 'a' }, 1000);
    scheduler.schedule('other', { data: 'b' }, 1000);
    expect(scheduler.getScheduledByType('test').length).toBe(1);
  });

  it('should execute and remove from scheduled', () => {
    const id = scheduler.schedule('test', { data: 'hello' }, 1000);
    let called = false;
    scheduler.execute(id, () => { called = true; });
    expect(called).toBe(true);
  });

  it('should maintain history after execution', () => {
    const id = scheduler.schedule('test', { data: 'hello' }, 1000);
    scheduler.execute(id, () => {});
    expect(scheduler.getHistory().length).toBe(1);
  });

  it('should export metrics with version', () => {
    scheduler.schedule('test', { data: 'hello' }, 1000);
    const metrics = scheduler.exportMetrics();
    expect(metrics.version).toBe('V89');
    expect(metrics.metrics.scheduled).toBe(1);
  });

  it('should reset and clear all scheduled', () => {
    scheduler.schedule('test', { data: 'hello' }, 1000);
    scheduler.reset();
    expect(scheduler.getScheduled().length).toBe(0);
  });

  it('should generate snapshot', () => {
    scheduler.schedule('test', { data: 'hello' }, 1000);
    const snap = scheduler.getSnapshot();
    expect(snap.scheduledCount).toBe(1);
  });
});

describe('EventMonitor', () => {
  let monitor: EventMonitor;

  beforeEach(() => {
    monitor = new EventMonitor({ maxEvents: 10, maxHistory: 5 });
  });

  it('should track events', () => {
    const id = monitor.track('test', { data: 'hello' });
    expect(id).toMatch(/^mon_/);
    expect(monitor.getActive().length).toBe(1);
  });

  it('should complete tracked events', () => {
    const id = monitor.track('test', { data: 'hello' });
    expect(monitor.complete(id)).toBe(true);
    expect(monitor.getActive().length).toBe(0);
    expect(monitor.getHistory().length).toBe(1);
  });

  it('should fail tracked events', () => {
    const id = monitor.track('test', { data: 'hello' });
    expect(monitor.fail(id)).toBe(true);
    expect(monitor.getActive().length).toBe(0);
  });

  it('should get active events', () => {
    monitor.track('a', { data: 'a' });
    monitor.track('b', { data: 'b' });
    expect(monitor.getActive().length).toBe(2);
  });

  it('should filter by category', () => {
    monitor.track('test', { data: 'a' }, { category: 'user' });
    monitor.track('test', { data: 'b' }, { category: 'system' });
    expect(monitor.getActiveByCategory('user').length).toBe(1);
  });

  it('should filter by type', () => {
    monitor.track('a', { data: 'a' });
    monitor.track('b', { data: 'b' });
    expect(monitor.getActiveByType('a').length).toBe(1);
  });

  it('should calculate metrics', () => {
    monitor.track('test', { data: 'hello' });
    const id = monitor.track('test', { data: 'hello' });
    monitor.complete(id);
    const m = monitor.getMetrics();
    expect(m.total).toBe(1);
    expect(m.byStatus.completed).toBe(1);
  });

  it('should export metrics with version', () => {
    monitor.track('test', { data: 'hello' });
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V89');
    expect(metrics.metrics.tracked).toBe(1);
  });

  it('should reset and clear all events', () => {
    monitor.track('test', { data: 'hello' });
    monitor.reset();
    expect(monitor.getActive().length).toBe(0);
    expect(monitor.getHistory().length).toBe(0);
  });

  it('should generate report string', () => {
    monitor.track('test', { data: 'hello' });
    const report = monitor.getReport();
    expect(report).toContain('EventMonitor Report');
    expect(report).toContain('Tracked');
  });

  it('should generate snapshot', () => {
    monitor.track('test', { data: 'hello' });
    const snap = monitor.getSnapshot();
    expect(snap.activeCount).toBe(1);
  });
});