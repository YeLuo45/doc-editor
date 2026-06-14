import { describe, it, expect } from 'vitest';
import {
  createLongTaskDetectorState, reportLongTask, getLongTasks, getLongTasksByAttribution,
  getTotalBlockingTime, clearLongTasks, setThreshold, getLongTaskDetectorReport,
} from '../../perf/V255-LongTaskDetector';

describe('V255 LongTaskDetector', () => {
  it('should create empty state', () => {
    const s = createLongTaskDetectorState();
    expect(s.tasks).toHaveLength(0);
  });

  it('should ignore tasks under threshold', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 30, 'main');
    expect(s.tasks).toHaveLength(0);
  });

  it('should detect minor long task', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 60, 'main');
    expect(s.tasks).toHaveLength(1);
    expect(s.bySeverity.minor).toBe(1);
  });

  it('should detect major long task', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 250, 'main');
    expect(s.bySeverity.major).toBe(1);
  });

  it('should detect critical long task', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 500, 'main');
    expect(s.bySeverity.critical).toBe(1);
  });

  it('should get long tasks by min severity', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 60, 'main');
    s = reportLongTask(s, 'b', 500, 'main');
    expect(getLongTasks(s, 'major')).toHaveLength(1);
  });

  it('should get tasks by attribution', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 60, 'render');
    s = reportLongTask(s, 'b', 60, 'ai');
    expect(getLongTasksByAttribution(s, 'render')).toHaveLength(1);
  });

  it('should get total blocking time', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 100, 'main');
    s = reportLongTask(s, 'b', 200, 'main');
    expect(getTotalBlockingTime(s)).toBe(300);
  });

  it('should clear tasks', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 60, 'main');
    s = clearLongTasks(s);
    expect(s.tasks).toHaveLength(0);
  });

  it('should set threshold', () => {
    let s = createLongTaskDetectorState();
    s = setThreshold(s, 100);
    expect(s.thresholdMs).toBe(100);
  });

  it('should produce report', () => {
    let s = createLongTaskDetectorState(50);
    s = reportLongTask(s, 'a', 60, 'main');
    const r = getLongTaskDetectorReport(s);
    expect(r.total).toBe(1);
    expect(r.threshold).toBe(50);
  });
});
