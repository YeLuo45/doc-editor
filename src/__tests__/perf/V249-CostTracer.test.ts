import { describe, it, expect } from 'vitest';
import {
  createCostTracerState, recordCost, setPricing, getCostByAgent, getCostByOperation,
  getTotalCostInWindow, getRecentRecords, clearCostRecords, getCostTracerReport,
} from '../../perf/V249-CostTracer';

describe('V249 CostTracer', () => {
  it('should create empty state', () => {
    const s = createCostTracerState();
    expect(s.records).toHaveLength(0);
  });

  it('should record cost', () => {
    let s = createCostTracerState();
    s = recordCost(s, 'a1', 'edit', 100, 200, 500);
    expect(s.records).toHaveLength(1);
    expect(s.totalCost).toBeGreaterThan(0);
  });

  it('should set pricing', () => {
    let s = createCostTracerState();
    s = setPricing(s, 0.001, 0.002);
    expect(s.costPerInputToken).toBe(0.001);
  });

  it('should get cost by agent', () => {
    let s = createCostTracerState();
    s = recordCost(s, 'a1', 'edit', 100, 200, 500);
    s = recordCost(s, 'a2', 'edit', 100, 200, 500);
    expect(getCostByAgent(s, 'a1')).toBeGreaterThan(0);
    expect(getCostByAgent(s, 'a2')).toBeGreaterThan(0);
  });

  it('should get cost by operation', () => {
    let s = createCostTracerState();
    s = recordCost(s, 'a1', 'edit', 100, 200, 500);
    s = recordCost(s, 'a1', 'review', 100, 200, 500);
    expect(getCostByOperation(s, 'edit')).toBeGreaterThan(0);
  });

  it('should get cost in time window', () => {
    let s = createCostTracerState();
    s = recordCost(s, 'a1', 'edit', 100, 200, 500);
    expect(getTotalCostInWindow(s, Date.now() - 1000)).toBeGreaterThan(0);
  });

  it('should get recent records', () => {
    let s = createCostTracerState();
    for (let i = 0; i < 20; i++) s = recordCost(s, 'a1', 'edit', 10, 20, 100);
    expect(getRecentRecords(s, 5)).toHaveLength(5);
  });

  it('should clear records', () => {
    let s = createCostTracerState();
    s = recordCost(s, 'a1', 'edit', 100, 200, 500);
    s = clearCostRecords(s);
    expect(s.records).toHaveLength(0);
  });

  it('should cap records at 1000', () => {
    let s = createCostTracerState();
    for (let i = 0; i < 1500; i++) s = recordCost(s, 'a1', 'edit', 10, 20, 100);
    expect(s.records).toHaveLength(1000);
  });

  it('should produce report', () => {
    let s = createCostTracerState();
    s = recordCost(s, 'a1', 'edit', 100, 200, 500);
    const r = getCostTracerReport(s);
    expect(r.totalCost).toBeGreaterThan(0);
    expect(r.byAgent.a1).toBeGreaterThan(0);
  });
});
