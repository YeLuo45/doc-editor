import { describe, it, expect } from 'vitest';
import {
  createPerfQuotaState, setQuota, checkPerfQuota, resetPerfQuota, getUsageForOp, getPerfQuotaReport,
} from '../../perf/V262-PerfQuota';

describe('V262 PerfQuota', () => {
  it('should create empty state', () => {
    const s = createPerfQuotaState();
    expect(s.configs.size).toBe(0);
  });

  it('should set quota', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 60, windowMs: 1000 });
    expect(s.configs.size).toBe(1);
  });

  it('should allow within limit', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 60, windowMs: 1000 });
    const r = checkPerfQuota(s, 'render');
    expect(r.allowed).toBe(true);
  });

  it('should block when over limit', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 2, windowMs: 1000 });
    s = checkPerfQuota(s, 'render').state;
    s = checkPerfQuota(s, 'render').state;
    const r = checkPerfQuota(s, 'render');
    expect(r.allowed).toBe(false);
  });

  it('should reset quota', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 1, windowMs: 1000 });
    s = checkPerfQuota(s, 'render').state;
    s = resetPerfQuota(s, 'render');
    expect(getUsageForOp(s, 'render')!.count).toBe(0);
  });

  it('should allow unconfigured op', () => {
    const s = createPerfQuotaState();
    const r = checkPerfQuota(s, 'render');
    expect(r.allowed).toBe(true);
  });

  it('should auto-reset after window', async () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 1, windowMs: 10 });
    s = checkPerfQuota(s, 'render').state;
    const blocked = checkPerfQuota(s, 'render');
    expect(blocked.allowed).toBe(false);
    await new Promise(r => setTimeout(r, 20));
    const after = checkPerfQuota(s, 'render');
    expect(after.allowed).toBe(true);
  });

  it('should count blocks', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 1, windowMs: 1000 });
    s = checkPerfQuota(s, 'render').state;
    s = checkPerfQuota(s, 'render').state;
    s = checkPerfQuota(s, 'render').state;
    expect(s.totalBlocked).toBe(2);
  });

  it('should track usage per op', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 5, windowMs: 1000 });
    s = setQuota(s, { op: 'ai_call', limit: 10, windowMs: 1000 });
    s = checkPerfQuota(s, 'render').state;
    s = checkPerfQuota(s, 'ai_call').state;
    expect(getUsageForOp(s, 'render')!.count).toBe(1);
    expect(getUsageForOp(s, 'ai_call')!.count).toBe(1);
  });

  it('should produce report', () => {
    let s = createPerfQuotaState();
    s = setQuota(s, { op: 'render', limit: 5, windowMs: 1000 });
    s = checkPerfQuota(s, 'render').state;
    const r = getPerfQuotaReport(s);
    expect(r.configured).toBe(1);
    expect(r.byOp.render.count).toBe(1);
  });
});
