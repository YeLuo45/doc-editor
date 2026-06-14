import { describe, it, expect } from 'vitest';
import {
  createNegotiateState, requestBudget, negotiate, setTotalBudget,
  getAllocation, getPendingRequests, getNegotiateReport,
} from '../../perf/V267-PerfNegotiate';

describe('V267 PerfNegotiate', () => {
  it('should create empty state', () => {
    const s = createNegotiateState();
    expect(s.pendingRequests).toHaveLength(0);
  });

  it('should request budget', () => {
    const s = createNegotiateState();
    const r = requestBudget(s, 'a1', 1000, 500, 5);
    expect(r.state.pendingRequests).toHaveLength(1);
  });

  it('should negotiate when within budget', () => {
    const s = createNegotiateState(10000);
    const r = requestBudget(s, 'a1', 1000, 500, 5);
    const n = negotiate(r.state, r.requestId);
    expect(n.grant).toBeDefined();
    expect(n.grant!.grantedTokens).toBe(1000);
  });

  it('should grant min tokens when over budget', () => {
    const s = createNegotiateState(1000);
    const r1 = requestBudget(s, 'a1', 500, 100, 5);
    const r2 = requestBudget(r1.state, 'a2', 800, 200, 5);
    const n = negotiate(r2.state, r2.requestId);
    expect(n.grant).toBeDefined();
    expect(n.grant!.grantedTokens).toBe(500);
  });

  it('should drop request when even min cannot be satisfied', () => {
    const s = createNegotiateState(100);
    const r = requestBudget(s, 'a1', 500, 200, 5);
    const n = negotiate(r.state, r.requestId);
    expect(n.grant).toBeUndefined();
    expect(n.state.pendingRequests).toHaveLength(0);
  });

  it('should return undefined for missing request', () => {
    const s = createNegotiateState();
    const n = negotiate(s, 'missing');
    expect(n.grant).toBeUndefined();
  });

  it('should set total budget', () => {
    let s = createNegotiateState();
    s = setTotalBudget(s, 50000);
    expect(s.totalBudget).toBe(50000);
  });

  it('should get allocation for agent', () => {
    let s = createNegotiateState(10000);
    const r = requestBudget(s, 'a1', 1000, 500, 5);
    negotiate(r.state, r.requestId);
    expect(getAllocation(s, 'a1')).toBe(0);  // s is not updated
  });

  it('should get pending requests', () => {
    let s = createNegotiateState(10000);
    s = requestBudget(s, 'a1', 100, 50, 5).state;
    s = requestBudget(s, 'a2', 100, 50, 5).state;
    expect(getPendingRequests(s)).toHaveLength(2);
  });

  it('should accumulate allocations for same agent', () => {
    let s = createNegotiateState(10000);
    const r1 = requestBudget(s, 'a1', 500, 100, 5);
    s = negotiate(r1.state, r1.requestId).state;
    const r2 = requestBudget(s, 'a1', 300, 100, 5);
    s = negotiate(r2.state, r2.requestId).state;
    expect(getAllocation(s, 'a1')).toBe(800);
  });

  it('should produce report', () => {
    let s = createNegotiateState(10000);
    const r = requestBudget(s, 'a1', 1000, 500, 5);
    s = negotiate(r.state, r.requestId).state;
    const report = getNegotiateReport(s);
    expect(report.allocated).toBe(1000);
    expect(report.byAgent.a1).toBe(1000);
  });
});
