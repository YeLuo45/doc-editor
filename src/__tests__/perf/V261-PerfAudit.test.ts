import { describe, it, expect } from 'vitest';
import {
  createPerfAuditState, recordAudit, getAuditsByType, getAuditsByComponent, getRecentAudits,
  getRegressions, clearAudits, getPerfAuditReport,
} from '../../perf/V261-PerfAudit';

describe('V261 PerfAudit', () => {
  it('should create empty state', () => {
    const s = createPerfAuditState();
    expect(s.entries).toHaveLength(0);
  });

  it('should record audit', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'config_change', 'render', { fps: 60 }, { fps: 30 }, 'changed config');
    expect(s.entries).toHaveLength(1);
  });

  it('should compute delta', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'optimization_applied', 'a', { fps: 30, memory: 200 }, { fps: 60, memory: 100 }, 'opt');
    const entry = s.entries[0];
    expect(entry.delta.fps).toBe(30);
    expect(entry.delta.memory).toBe(-100);
  });

  it('should get audits by type', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'regression_detected', 'a', {}, {}, 'r');
    s = recordAudit(s, 'optimization_applied', 'a', {}, {}, 'o');
    expect(getAuditsByType(s, 'regression_detected')).toHaveLength(1);
  });

  it('should track regressions count', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'regression_detected', 'a', {}, {}, 'r');
    expect(s.regressions).toBe(1);
  });

  it('should get audits by component', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'config_change', 'a', {}, {}, 'r');
    s = recordAudit(s, 'config_change', 'b', {}, {}, 'r');
    expect(getAuditsByComponent(s, 'a')).toHaveLength(1);
  });

  it('should get recent audits', () => {
    let s = createPerfAuditState();
    for (let i = 0; i < 20; i++) s = recordAudit(s, 'config_change', 'a', {}, {}, 'r');
    expect(getRecentAudits(s, 5)).toHaveLength(5);
  });

  it('should get regressions', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'regression_detected', 'a', {}, {}, 'r');
    expect(getRegressions(s)).toHaveLength(1);
  });

  it('should clear audits', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'config_change', 'a', {}, {}, 'r');
    s = clearAudits(s);
    expect(s.entries).toHaveLength(0);
  });

  it('should track recoveries', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'recovered', 'a', {}, {}, 'r');
    expect(s.recoveries).toBe(1);
  });

  it('should produce report', () => {
    let s = createPerfAuditState();
    s = recordAudit(s, 'config_change', 'a', {}, {}, 'r');
    const r = getPerfAuditReport(s);
    expect(r.byType.config_change).toBe(1);
  });
});
