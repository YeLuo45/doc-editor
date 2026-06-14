import { describe, it, expect } from 'vitest';
import {
  createOverlayState, setOverlayEnabled, recordMetric, getMetricBuffer, getLatestMetric,
  getCriticalMetrics, clearOverlayMetrics, getOverlayReport,
} from '../../perf/V252-PerfOverlay';

describe('V252 PerfOverlay', () => {
  it('should create empty state', () => {
    const s = createOverlayState();
    expect(s.metrics).toHaveLength(0);
    expect(s.enabled).toBe(false);
  });

  it('should set enabled', () => {
    let s = createOverlayState();
    s = setOverlayEnabled(s, true);
    expect(s.enabled).toBe(true);
  });

  it('should record metric', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'fps', 60, 'fps', 30);
    expect(s.metrics).toHaveLength(1);
  });

  it('should mark warning when threshold exceeded', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'memory', 80, 'MB', 50);
    expect(s.warningCount).toBe(1);
  });

  it('should mark critical when 2x threshold exceeded', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'memory', 200, 'MB', 50);
    expect(s.criticalCount).toBe(1);
  });

  it('should append to existing metric buffer', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'fps', 60, 'fps', 30);
    s = recordMetric(s, 'fps', 30, 'fps', 30);
    expect(getMetricBuffer(s, 'fps')!.recent).toHaveLength(2);
  });

  it('should get latest metric', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'fps', 60, 'fps', 30);
    s = recordMetric(s, 'fps', 30, 'fps', 30);
    expect(getLatestMetric(s, 'fps')!.value).toBe(30);
  });

  it('should get critical metrics', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'memory', 200, 'MB', 50);
    expect(getCriticalMetrics(s)).toHaveLength(1);
  });

  it('should clear metrics', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'fps', 60, 'fps', 30);
    s = clearOverlayMetrics(s);
    expect(s.metrics).toHaveLength(0);
  });

  it('should not warn without threshold', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'fps', 60, 'fps');
    expect(s.warningCount).toBe(0);
  });

  it('should produce report', () => {
    let s = createOverlayState();
    s = recordMetric(s, 'fps', 60, 'fps', 30);
    const r = getOverlayReport(s);
    expect(r.byMetric.fps).toBe(1);
  });
});
