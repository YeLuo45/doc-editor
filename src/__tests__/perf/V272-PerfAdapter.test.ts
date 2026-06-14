import { describe, it, expect } from 'vitest';
import {
  createPerfAdapterState, setPerfContext, adaptPerf,
  getLatestAdaptation, getAdaptationForContext, clearAdaptations, getPerfAdapterReport,
} from '../../perf/V272-PerfAdapter';

describe('V272 PerfAdapter', () => {
  it('should create empty state', () => {
    const s = createPerfAdapterState();
    expect(s.adaptations.size).toBe(0);
  });

  it('should set context', () => {
    let s = createPerfAdapterState();
    s = setPerfContext(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.1 });
    expect(s.currentContext).not.toBeNull();
  });

  it('should adapt for fast network', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.1 });
    const a = getLatestAdaptation(s)!;
    expect(a.recommendedCache).toBe('lru');
    expect(a.recommendedCompression).toBeLessThan(0.5);
  });

  it('should adapt for offline network', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'offline', device: 'mobile', batteryLevel: 0.5, isCharging: false, memoryPressure: 0.3 });
    const a = getLatestAdaptation(s)!;
    expect(a.recommendedParallel).toBe(0);
    expect(a.recommendedCompression).toBeGreaterThanOrEqual(0.7);
  });

  it('should adapt for low battery', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'mobile', batteryLevel: 0.1, isCharging: false, memoryPressure: 0.3 });
    const a = getLatestAdaptation(s)!;
    expect(a.recommendedCompression).toBeGreaterThanOrEqual(0.8);
  });

  it('should adapt for high memory pressure', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.9 });
    const a = getLatestAdaptation(s)!;
    expect(a.recommendedCompression).toBeGreaterThanOrEqual(0.5);
  });

  it('should adapt for slow network', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'slow', device: 'mobile', batteryLevel: 1, isCharging: true, memoryPressure: 0.3 });
    const a = getLatestAdaptation(s)!;
    expect(a.recommendedCache).toBe('lfu');
    expect(a.recommendedParallel).toBe(1);
  });

  it('should get latest adaptation', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.1 });
    s = adaptPerf(s, { network: 'slow', device: 'mobile', batteryLevel: 0.5, isCharging: true, memoryPressure: 0.3 });
    expect(getLatestAdaptation(s)!.context.network).toBe('slow');
  });

  it('should get adaptation for context', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.1 });
    expect(getAdaptationForContext(s, 'fast', 'desktop')).toBeDefined();
  });

  it('should clear adaptations', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.1 });
    s = clearAdaptations(s);
    expect(s.adaptations.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createPerfAdapterState();
    s = adaptPerf(s, { network: 'fast', device: 'desktop', batteryLevel: 1, isCharging: true, memoryPressure: 0.1 });
    const r = getPerfAdapterReport(s);
    expect(r.adaptations).toBe(1);
    expect(r.byNetwork.fast).toBe(1);
  });
});
