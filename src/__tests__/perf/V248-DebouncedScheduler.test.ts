import { describe, it, expect } from 'vitest';
import {
  createSchedulerState, registerTask, triggerTask, completeDebounced,
  getTask, unregisterTask, getSchedulerReport,
} from '../../perf/V248-DebouncedScheduler';

describe('V248 DebouncedScheduler', () => {
  it('should create empty state', () => {
    const s = createSchedulerState();
    expect(s.tasks.size).toBe(0);
  });

  it('should register task', () => {
    let s = createSchedulerState();
    s = registerTask(s, 't1', () => {}, 'debounce', 100);
    expect(s.tasks.size).toBe(1);
  });

  it('should execute leading task', () => {
    let s = createSchedulerState();
    let count = 0;
    s = registerTask(s, 't1', () => { count++; }, 'leading', 100);
    s = triggerTask(s, 't1');
    expect(count).toBe(1);
  });

  it('should mark debounce task pending', () => {
    let s = createSchedulerState();
    let count = 0;
    s = registerTask(s, 't1', () => { count++; }, 'debounce', 100);
    s = triggerTask(s, 't1');
    expect(getTask(s, 't1')!.pending).toBe(true);
  });

  it('should throttle calls within window', () => {
    let s = createSchedulerState();
    let count = 0;
    s = registerTask(s, 't1', () => { count++; }, 'throttle', 1000);
    s = triggerTask(s, 't1');
    s = triggerTask(s, 't1');
    s = triggerTask(s, 't1');
    expect(count).toBe(1);
    expect(s.totalThrottled).toBe(2);
  });

  it('should complete debounced task', () => {
    let s = createSchedulerState();
    let count = 0;
    s = registerTask(s, 't1', () => { count++; }, 'debounce', 100);
    s = triggerTask(s, 't1');
    s = completeDebounced(s, 't1');
    expect(count).toBe(1);
    expect(s.totalExecutions).toBe(1);
  });

  it('should unregister task', () => {
    let s = createSchedulerState();
    s = registerTask(s, 't1', () => {}, 'debounce', 100);
    s = unregisterTask(s, 't1');
    expect(s.tasks.size).toBe(0);
  });

  it('should return undefined for missing task on trigger', () => {
    const s = createSchedulerState();
    const newState = triggerTask(s, 'missing');
    expect(newState).toBe(s);
  });

  it('should not complete non-pending task', () => {
    let s = createSchedulerState();
    let count = 0;
    s = registerTask(s, 't1', () => { count++; }, 'throttle', 1000);
    s = completeDebounced(s, 't1');
    expect(count).toBe(0);
  });

  it('should produce report', () => {
    let s = createSchedulerState();
    s = registerTask(s, 't1', () => {}, 'debounce', 100);
    s = registerTask(s, 't2', () => {}, 'throttle', 100);
    const r = getSchedulerReport(s);
    expect(r.tasks).toBe(2);
  });
});
