import { describe, it, expect } from 'vitest';
import {
  createAdaptiveRendererState, updateRenderWindow, getVisibleRange, getSkippedRatio,
  clearRenderHistory, getAdaptiveRendererReport,
} from '../../perf/V247-AdaptiveRenderer';

describe('V247 AdaptiveRenderer', () => {
  it('should create empty state', () => {
    const s = createAdaptiveRendererState();
    expect(s.currentWindow.totalItems).toBe(0);
  });

  it('should update render window', () => {
    let s = createAdaptiveRendererState(50, 5);
    s = updateRenderWindow(s, 0, 500, 100);
    expect(s.currentWindow.startIndex).toBe(0);
    expect(s.currentWindow.endIndex).toBeGreaterThan(0);
  });

  it('should respect buffer size', () => {
    let s = createAdaptiveRendererState(50, 10);
    s = updateRenderWindow(s, 250, 500, 100);
    // startIndex should be 5 - 10 = 0
    expect(s.currentWindow.startIndex).toBe(0);
  });

  it('should skip items outside window', () => {
    let s = createAdaptiveRendererState(50, 0);
    s = updateRenderWindow(s, 0, 500, 10000);
    expect(s.currentWindow.endIndex).toBe(10);
    expect(s.totalSkipped).toBeGreaterThan(0);
  });

  it('should get visible range', () => {
    let s = createAdaptiveRendererState(50, 5);
    s = updateRenderWindow(s, 0, 500, 100);
    const range = getVisibleRange(s);
    expect(range.start).toBe(0);
    expect(range.end).toBeGreaterThan(0);
  });

  it('should track skipped ratio', () => {
    let s = createAdaptiveRendererState(50, 0);
    s = updateRenderWindow(s, 0, 500, 1000);
    expect(getSkippedRatio(s)).toBeGreaterThan(0);
  });

  it('should return 0 skipped ratio for no renders', () => {
    const s = createAdaptiveRendererState();
    expect(getSkippedRatio(s)).toBe(0);
  });

  it('should clear render history', () => {
    let s = createAdaptiveRendererState(50, 0);
    s = updateRenderWindow(s, 0, 500, 1000);
    s = clearRenderHistory(s);
    expect(s.totalRenders).toBe(0);
  });

  it('should cap history at 100', () => {
    let s = createAdaptiveRendererState(50, 0);
    for (let i = 0; i < 150; i++) s = updateRenderWindow(s, 0, 500, 1000);
    expect(s.history).toHaveLength(100);
  });

  it('should produce report', () => {
    let s = createAdaptiveRendererState(50, 0);
    s = updateRenderWindow(s, 0, 500, 1000);
    const r = getAdaptiveRendererReport(s);
    expect(r.currentTotal).toBe(1000);
  });
});
