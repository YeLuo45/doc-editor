import { describe, it, expect } from 'vitest';
import {
  createRenderProfilerState, recordRender, getRendersForComponent, getSlowRenders,
  getComponentStats, getSlowestComponents, clearRenderRecords, getRenderProfilerReport,
} from '../../perf/V259-RenderProfiler';

describe('V259 RenderProfiler', () => {
  it('should create empty state', () => {
    const s = createRenderProfilerState();
    expect(s.records).toHaveLength(0);
  });

  it('should record render', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'Header', 5, 3);
    expect(s.records).toHaveLength(1);
  });

  it('should track component stats', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'Header', 5);
    s = recordRender(s, 'Header', 10);
    const stats = getComponentStats(s, 'Header');
    expect(stats!.count).toBe(2);
    expect(stats!.avgMs).toBe(7.5);
    expect(stats!.maxMs).toBe(10);
  });

  it('should get renders for component', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'Header', 5);
    s = recordRender(s, 'Footer', 10);
    expect(getRendersForComponent(s, 'Header')).toHaveLength(1);
  });

  it('should get slow renders', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'Header', 5);
    s = recordRender(s, 'Header', 20);
    expect(getSlowRenders(s, 16)).toHaveLength(1);
  });

  it('should get slowest components', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'A', 5);
    s = recordRender(s, 'B', 50);
    s = recordRender(s, 'C', 20);
    const slowest = getSlowestComponents(s, 2);
    expect(slowest[0].component).toBe('B');
  });

  it('should return undefined for unknown component', () => {
    const s = createRenderProfilerState();
    expect(getComponentStats(s, 'unknown')).toBeUndefined();
  });

  it('should clear records', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'a', 5);
    s = clearRenderRecords(s);
    expect(s.records).toHaveLength(0);
  });

  it('should cap records at 1000', () => {
    let s = createRenderProfilerState();
    for (let i = 0; i < 1500; i++) s = recordRender(s, 'a', 1);
    expect(s.records).toHaveLength(1000);
  });

  it('should track rerender', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'a', 5, 0, true);
    expect(s.records[0].rerender).toBe(true);
  });

  it('should produce report', () => {
    let s = createRenderProfilerState();
    s = recordRender(s, 'a', 10);
    s = recordRender(s, 'b', 20);
    const r = getRenderProfilerReport(s);
    expect(r.totalRenders).toBe(2);
    expect(r.components).toBe(2);
  });
});
