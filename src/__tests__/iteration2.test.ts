/**
 * iteration2.test.ts - Test suite for doc-editor V32 Iteration 2 modules
 * Tests Processor, Handler, Scheduler, and Monitor modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Processor } from '../iteration2/Processor';
import { Handler } from '../iteration2/Handler';
import { Scheduler } from '../iteration2/Scheduler';
import { Monitor } from '../iteration2/Monitor';

describe('Processor', () => {
  let processor: Processor;

  beforeEach(() => {
    processor = new Processor();
  });

  it('should create a new processor instance', () => {
    expect(processor).toBeDefined();
  });

  it('should run a task with run()', () => {
    const task = processor.run({ data: 'test' });
    expect(task).toBeDefined();
    expect(task.id).toMatch(/^proc_/);
    expect(task.status).toBe('pending');
  });

  it('should process a task with process()', () => {
    const task = processor.run({ data: 'test' });
    const processed = processor.process(task.id);
    expect(processed).toBeDefined();
  });

  it('should get task status with getStatus()', () => {
    const task = processor.run({ data: 'test' });
    const status = processor.getStatus(task.id);
    expect(status).toBeDefined();
    expect(status?.id).toBe(task.id);
  });

  it('should return undefined for unknown task', () => {
    const status = processor.getStatus('unknown');
    expect(status).toBeUndefined();
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = processor.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.tasks).toBeInstanceOf(Map);
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset with reset()', () => {
    processor.run({ data: 'test' });
    processor.reset();
    const snapshot = processor.getSnapshot();
    expect(snapshot.tasks.size).toBe(0);
    expect(snapshot.metrics.totalProcessed).toBe(0);
  });

  it('should generate report with getReport()', () => {
    const report = processor.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
    expect(report.metrics).toBeDefined();
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = processor.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.timestamp).toBeDefined();
    expect(exported.metrics).toBeDefined();
    expect(exported.exportVersion).toBe('V32-I2');
  });
});

describe('Handler', () => {
  let handler: Handler;

  beforeEach(() => {
    handler = new Handler();
  });

  it('should create a new handler instance', () => {
    expect(handler).toBeDefined();
  });

  it('should handle an event', () => {
    const mockHandler = vi.fn();
    handler.registerHandler('test', mockHandler, ['testEvent']);
    const event = handler.dispatch('testEvent', { data: 'test' });
    expect(event).toBeDefined();
    expect(event.type).toBe('testEvent');
  });

  it('should dispatch events with dispatch()', () => {
    const event = handler.dispatch('myEvent', { value: 123 });
    expect(event.type).toBe('myEvent');
    expect(event.payload).toEqual({ value: 123 });
  });

  it('should register handlers with registerHandler()', () => {
    const h = handler.registerHandler('testHandler', vi.fn(), ['event1', 'event2']);
    expect(h).toBeDefined();
    expect(h.name).toBe('testHandler');
    expect(h.enabled).toBe(true);
  });

  it('should get handlers with getHandlers()', () => {
    handler.registerHandler('h1', vi.fn(), ['e1']);
    handler.registerHandler('h2', vi.fn(), ['e2']);
    const handlers = handler.getHandlers();
    expect(handlers.length).toBe(2);
  });

  it('should remove a handler with removeHandler()', () => {
    const h = handler.registerHandler('toRemove', vi.fn(), ['event']);
    const removed = handler.removeHandler(h.id);
    expect(removed).toBe(true);
    expect(handler.getHandler(h.id)).toBeUndefined();
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = handler.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.handlers).toBeInstanceOf(Map);
  });

  it('should reset with reset()', () => {
    handler.registerHandler('test', vi.fn(), ['event']);
    handler.reset();
    const handlers = handler.getHandlers();
    expect(handlers.length).toBe(0);
  });

  it('should get report with getReport()', () => {
    const report = handler.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = handler.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.exportVersion).toBe('V32-I2');
  });
});

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = new Scheduler();
  });

  it('should create a new scheduler instance', () => {
    expect(scheduler).toBeDefined();
  });

  it('should schedule a task with schedule()', () => {
    const task = scheduler.schedule(vi.fn(), 1000, { name: 'myTask' });
    expect(task).toBeDefined();
    expect(task.name).toBe('myTask');
    expect(task.interval).toBe(1000);
    expect(task.enabled).toBe(true);
  });

  it('should cancel a task with cancel()', () => {
    const task = scheduler.schedule(vi.fn(), 1000);
    const cancelled = scheduler.cancel(task.id);
    expect(cancelled).toBe(true);
    expect(scheduler.getScheduled(task.id)).toBeUndefined();
  });

  it('should return false when cancelling unknown task', () => {
    const cancelled = scheduler.cancel('unknown');
    expect(cancelled).toBe(false);
  });

  it('should get scheduled task with getScheduled()', () => {
    const task = scheduler.schedule(vi.fn(), 1000);
    const found = scheduler.getScheduled(task.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(task.id);
  });

  it('should get all scheduled tasks with getAllScheduled()', () => {
    scheduler.schedule(vi.fn(), 1000);
    scheduler.schedule(vi.fn(), 2000);
    const all = scheduler.getAllScheduled();
    expect(all.length).toBe(2);
  });

  it('should pause and resume tasks', () => {
    const task = scheduler.schedule(vi.fn(), 1000);
    const paused = scheduler.pause(task.id);
    expect(paused).toBe(true);
    const resumed = scheduler.resume(task.id);
    expect(resumed).toBe(true);
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = scheduler.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.tasks).toBeInstanceOf(Map);
  });

  it('should reset with reset()', () => {
    scheduler.schedule(vi.fn(), 1000);
    scheduler.reset();
    const all = scheduler.getAllScheduled();
    expect(all.length).toBe(0);
  });

  it('should get report with getReport()', () => {
    const report = scheduler.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = scheduler.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.exportVersion).toBe('V32-I2');
  });
});

describe('Monitor', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = new Monitor();
  });

  it('should create a new monitor instance', () => {
    expect(monitor).toBeDefined();
  });

  it('should start monitoring with monitor()', () => {
    monitor.monitor();
    const metrics = monitor.getMetrics();
    expect(metrics).toBeDefined();
  });

  it('should update metrics with updateMetrics()', () => {
    monitor.updateMetrics();
    const metrics = monitor.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
  });

  it('should get metrics with getMetrics()', () => {
    const metrics = monitor.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.cpuUsage).toBeDefined();
    expect(metrics.memoryUsage).toBeDefined();
  });

  it('should get health indicators', () => {
    const indicator = monitor.getHealthIndicator('cpu');
    expect(indicator).toBeDefined();
    const all = monitor.getAllHealthIndicators();
    expect(all.length).toBeGreaterThan(0);
  });

  it('should get report with getReport()', () => {
    const report = monitor.getReport();
    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
    expect(report.healthIndicators).toBeDefined();
  });

  it('should get snapshot with getSnapshot()', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should reset with reset()', () => {
    monitor.monitor();
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.uptime).toBe(0);
  });

  it('should export metrics with exportMetrics()', () => {
    const exported = monitor.exportMetrics();
    expect(exported).toBeDefined();
    expect(exported.exportVersion).toBe('V32-I2');
    expect(exported.history).toBeDefined();
  });

  it('should add custom health indicator', () => {
    const indicator = monitor.addHealthIndicator(
      'custom',
      50,
      (value) => value > 40 ? 'critical' : 'healthy'
    );
    expect(indicator).toBeDefined();
    expect(indicator.name).toBe('custom');
  });

  it('should evaluate health status correctly', () => {
    const report = monitor.getReport();
    expect(['healthy', 'degraded', 'critical']).toContain(report.status);
    expect(report.overallHealth).toBeGreaterThanOrEqual(0);
    expect(report.overallHealth).toBeLessThanOrEqual(100);
  });
});